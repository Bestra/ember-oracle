import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as path from 'path'
import * as fs from 'fs'
import * as types from './types'
import * as ember from '../ember'
import * as resolver from '../util/resolver'
import * as registry from '../util/registry'
import * as _ from 'lodash'

type Position = htmlBars.Position;
export class ComponentInvocation implements types.ComponentInvocation {
    template: Template
    astNode: htmlBars.MustacheStatement;
    isBlock: boolean;

    constructor(template, node) {
        this.astNode = node;
        this.template = template;
    }

    get attrs() {
        let pairs = this.astNode.hash.pairs;
        return _.map(pairs, 'key');
    }

    get definedInSourceAt() {
        return null;
    }
}

export class Path implements types.Path {
    template: Template;
    astNode: htmlBars.PathExpression;
    get definedInSourceAt() {
        return null;
    }
    constructor(template, astNode) {
        this.template = template;
        this.astNode = astNode;
    }
    get root() {
        return this.astNode.parts[0];
    }
}

export class Block implements types.TemplateDefineable {
    template: Template;
    get definedInTemplateAt() {
        return null;
    }
}

export class NullPosition implements types.TemplateDefineable {
    template: Template;
    position: Position;

    constructor(template, position) {
        this.template = template;
    }
    get definedInTemplateAt() {
        return {
            filePath: this.template.filePath,
            position: this.position
        };
    }
}

export class BlockParam implements types.BlockParam {
    path;
    index;
    block;

    constructor(block, path, index: number) {
        this.block = block;
        this.path = path;
        this.index = index;
    }
    get definedInTemplateAt() {
        return null
    }

    static fromPath(path: Path) {
        let root = path.root;
        return new BlockParam(path.template, path.astNode, 0);
    }
}

function startsWithin(line, column, container) {
    if (line < container.line) { return false; } // completely excluded
    if (line > container.line) { return true; } // completely included
    if (line === container.line) {
        if (column >= container.column) {
            return true;
        } else {
            return false;
        }
    }
}

function endsWithin(line, column, container) {
    if (line > container.line) { return false; } // completely excluded
    if (line < container.line) { return true; } // completely included
    if (line === container.line) {
        if (column <= container.column) {
            return true;
        } else {
            return false;
        }
    }
}

function containsPosition({loc}: htmlBars.ASTNode, {line, column}: htmlBars.Position) {
    return startsWithin(line, column, loc) &&
        endsWithin(line, column, loc);
}

function findNodes<T>(ast, type, filterFn: (node: T) => boolean) {
    let found: T[] = [];
    let finder = {};
    finder[type] = {};
    finder[type].enter = function (node: T) {
        if (filterFn(node)) {
            found.push(node);
        }
    };
    htmlBars.traverse(ast, finder);
    return found;
}

export class Template implements types.ASTBacked<htmlBars.Program> {
    moduleName: string;

    get components(): ComponentInvocation[] {
        let blockComponents = this.blocks.filter((block) => {
            return !!registry.findComponent(block.path.original)
        }).map((block) => new ComponentInvocation(this, block))

        let mustacheComponents = findNodes<htmlBars.MustacheStatement>(
            this.astNode,
            'MustacheStatement',
            (n) => !!registry.findComponent(n.path.original)
        ).map((n) => new ComponentInvocation(this, n));

        return blockComponents.concat(mustacheComponents);
    }

    get blocks() {
        return findNodes<htmlBars.BlockStatement>(this.astNode, 'BlockStatement', () => true);
    }
    get filePath() {
        return registry.lookup(this.moduleName).filePath;
    }

    get astNode() {
        return htmlBars.parse(this.filePath);
    }

    constructor(moduleName: string) {
        this.moduleName = moduleName;
    }

    parsePosition(position: Position): types.SourceDefineable | types.TemplateDefineable {
        // check in order of likelihood
        // is it a path?
        // if it's not, return a NullLocation
        // if it is, check if it's a blockParam
        let pathExpr = findNodes<htmlBars.PathExpression>(
            this.astNode,
            'PathExpression',
            (node) => containsPosition(node, position)
        )[0];
        if (pathExpr) {
            let foundPath = new Path(this, pathExpr);
            let blockParam = BlockParam.fromPath(foundPath);

            if (blockParam) {
                return blockParam;
            } else {
                return foundPath;
            }
        } else {
            return new NullPosition(this, position);
        }
    }
}


function withinBlock(block: htmlBars.BlockStatement, position: htmlBars.Position): boolean {
    return block.loc.start.line < position.line && block.loc.end.line > position.line;
}

function isComponent(path: string): boolean {
    return !!path.match(/-/);
};

function findBlockModule(block: htmlBars.BlockStatement): string {
    let pathString = block.path.original;
    if (isComponent(pathString)) {
        return "template:components/" + pathString;
    } else {
        return null;
    }
};

export function extractBlockParam(template: types.Template, pathName: string, position: htmlBars.Position): types.BlockParam {
    let ast = htmlBars.parse(template.source);
    let templateModule = resolver.moduleNameFromPath(template.filePath);

    let blocks: htmlBars.BlockStatement[] = [];
    htmlBars.traverse(ast, {
        BlockStatement: {
            enter(node: htmlBars.BlockStatement) {
                blocks.push(node);
            }
        }
    });
    return blocks
        .filter(block => containsPosition(block, position))
        .map(blockNode => {
            let sourceModule = findBlockModule(blockNode);
            return {
                type: "BlockParam",
                name: pathName,
                blockNode,
                index: blockNode.program.blockParams.indexOf(pathName),
                sourceModule: sourceModule || templateModule,
                isYielded: !!sourceModule
            }
        }).find(param => param.index > -1);
}

interface SourcePosition {
    filePath: string;
    loc: { line: number, column: number };
}

function isBlockParam(src: types.PathSource): src is types.BlockParam {
    return src.type === "BlockParam"
}

function findYieldLocation(blockParam: types.BlockParam) {
    let yieldTemplate = resolver.filePathForModule(blockParam.sourceModule);
    let yieldSrc = fs.readFileSync(yieldTemplate, 'utf8');
    let ast = htmlBars.parse(yieldSrc);
    let yieldedVarLoc;
    htmlBars.traverse(ast, {
        MustacheStatement: {
            enter(node: htmlBars.MustacheStatement) {
                if (node.params[blockParam.index]) {
                    yieldedVarLoc = node.params[blockParam.index].loc.start;
                }
            }
        }
    })

    return { filePath: yieldTemplate, loc: yieldedVarLoc }
}

type FileLocation = { filePath; loc: { line; column } };
function findLocationInFile(varToFind: types.PathSource): FileLocation {
    console.log(varToFind);
    if (isBlockParam(varToFind)) {
        if (varToFind.isYielded) {
            console.log("yielded");
            return findYieldLocation(varToFind);
        } else {
            // find the block expression in the source template
            console.log("loc is", varToFind.blockNode.loc);
            return { filePath: resolver.filePathForModule(varToFind.sourceModule), loc: varToFind.blockNode.loc.start }
        }
    } else {
        console.log("find controller", varToFind.sourceModule);
        // call the findAttr function or something with the path's context.

        let propertyLocation = ember.propertyLocation(varToFind.sourceModule, varToFind.name);
        console.log("location is >>>>", propertyLocation)
        if (!propertyLocation) {
            propertyLocation = { line: 0, column: 0 };
        }
        return { filePath: resolver.filePathForModule(varToFind.sourceModule), loc: propertyLocation }
    }


}

export function findDefinition(template: Template, variableName: string, pos: htmlBars.Position) {
    let destinationModule = findPathDefinition(template, variableName, pos);
    return findLocationInFile(destinationModule);
}

export default function findPathDefinition(template: Template, variableName: string, pos: htmlBars.Position): PathSource {
    let blockParam = extractBlockParam(template, variableName, pos);
    if (blockParam) {
        return blockParam;
    } else {
        let templateModule = resolver.moduleNameFromPath(template.filePath);
        let templateContextModule = resolver.templateContext(templateModule);
        return { type: "BoundPath", name: variableName, sourceModule: templateContextModule };
    }
}

