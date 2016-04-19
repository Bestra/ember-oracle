import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as path from 'path'
import * as fs from 'fs'
import * as ember from '../ember'
import * as resolver from '../util/resolver'
import {findComponent, lookup} from '../util/registry'
import * as _ from 'lodash'
import {
    containsPosition,
    findNodes
} from './util'

type Position = htmlBars.Position;
type FilePosition = { filePath; position: Position };

export interface Defineable {
    definedAt: FilePosition;
}

class NullPosition implements Defineable {
    definedAt;

}

class TemplateMember<T> implements Defineable {
    containingTemplate: Template;
    astNode: T;

    constructor(template, node) {
        this.containingTemplate = template;
        this.astNode = node;
    }

    get definedAt() {
        return null;
    }
}

export class Mustache extends TemplateMember<htmlBars.MustacheStatement>
{
    get pathString() {
        return this.astNode.path.original;
    }
    get attrs() {
        let pairs = this.astNode.hash.pairs;
        return _.map(pairs, 'key');
    }
}

export class Block extends Mustache {
    blockParamDefinition(_index): FilePosition {
        return {
            filePath: this.containingTemplate.filePath,
            position: this.astNode.loc.start
        }
    }
}

export class ComponentInvocation extends Block {
    isBlock: boolean;
    get templateModule() {
        return resolver.componentTemplate(this.pathString);
    }
    
    get templateFilePath() {
        return lookup(this.templateModule);
    }
    
    blockParamDefinition(index): FilePosition {
        return {
            filePath: this.templateFilePath,
            position: new Template(this.templateModule).yieldPosition(index)
        }
    }
}

export class Path extends TemplateMember<htmlBars.PathExpression> {
    astNode: htmlBars.PathExpression;

    get root() {
        return this.astNode.parts[0];
    }
}

export class BlockParam extends Path {
    index;
    block: Block;

    get definedAt() {
        return this.block.blockParamDefinition(this.index);
    }
    
    constructor(template, node, block, index) {
       super(template, node);
       this.block = block;
       this.index = index;
    }
}

export class Template {
    moduleName: string;

    get components(): ComponentInvocation[] {
        let blockComponents = this.blocks.filter((block) => {
            return !!findComponent(block.path.original)
        }).map((block) => new ComponentInvocation(this, block))

        let mustacheComponents = findNodes<htmlBars.MustacheStatement>(
            this.astNode,
            'MustacheStatement',
            (n) => !!findComponent(n.path.original)
        ).map((n) => new ComponentInvocation(this, n));

        return blockComponents.concat(mustacheComponents);
    }

    get blocks() {
        return findNodes<htmlBars.BlockStatement>(this.astNode, 'BlockStatement', () => true);
    }
    get filePath() {
        return lookup(this.moduleName).filePath;
    }

    get astNode() {
        return htmlBars.parse(this.filePath);
    }

    constructor(moduleName: string) {
        this.moduleName = moduleName;
    }

    yieldPosition(index) {
        let yieldNode = findNodes<htmlBars.MustacheStatement>(
            this.astNode,
            'MustacheStatement',
            node => node.path.original === 'yield'
        )[0];
        return yieldNode.params[index].loc.start;
    }

    parsePosition(position: Position): Defineable {
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
            // eventually this should include actions, etc.
            // for now if it's not a path we don't care
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

