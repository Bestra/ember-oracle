import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as path from 'path'
import * as fs from 'fs'
import * as ember from '../ember'
import * as resolver from '../util/resolver'
import { findComponent, lookup, fileContents } from '../util/registry'
import * as _ from 'lodash'
import {
    containsPosition,
    containsNode,
    findNodes
} from './util'

type Position = htmlBars.Position;
type FilePosition = { filePath: string; position: Position };
interface Dict<T> {
    [index: string]: T
}
export interface Defineable {
    definedAt: FilePosition;
}

class NullPosition implements Defineable {
    template: Template;
    position: Position;

    //TODO: make this take a node
    constructor(template, position) {
        this.template = template;
        this.position = position;
    }
    get definedAt() {
        return {
            filePath: this.template.filePath,
            position: this.position
        }
    }
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

    get params() {
        return this.astNode.params;
    }
}

export class Partial extends Mustache implements TemplateInvocation {
    get templateModule() {
        return 'template:' + this.templatePath;
    }
    get isPartial() {
        return true
    }
    
    get moduleName() {
        return this.templateModule;
    }

    get templatePath() {
        let partialPath = this.params[0] as htmlBars.StringLiteral;
        return partialPath.original
    }

    get templateFilePath() {
        let m = lookup(this.templateModule);
        return m && m.filePath;
    }
    
    get props() {
        return {};
    }

    get invokedAt() {
        return {
            filePath: lookup(this.containingTemplate.moduleName).filePath,
            position: this.astNode.loc.start
        }
    }

    get definedAt() {
        let filePath = this.templateFilePath;
        return {
            filePath,
            position: { line: 0, column: 0 }
        }
    }
}

export class Block extends Mustache {
    astNode: htmlBars.BlockStatement;

    get blockParams() {
        return this.astNode.program.blockParams;
    }

    blockParamDefinition(_index): FilePosition {
        return {
            filePath: this.containingTemplate.filePath,
            position: this.astNode.loc.start
        }
    }
}

export interface TemplateInvocation {
    invokedAt:
    {
        filePath: string,
        position: Position
    }
    astNode: htmlBars.ASTNode;

    templateModule: string;
    moduleName: string;
    isPartial: boolean;
    props: {}
}

export class ComponentInvocation extends Block implements TemplateInvocation {
    get templateModule() {
        return resolver.componentTemplate(this.pathString);
    }

    get templateFilePath() {
        let m = lookup(this.templateModule);
        return m && m.filePath;
    }

    get props() {
        let pairs = _.map(this.astNode.hash.pairs, (p) => {
            return [p.key, p.value]
        });
        return _.fromPairs(pairs);
    }
    
    get isPartial() {
        return false
    }


    get moduleName() {
        return 'component:' + this.pathString;
    }

    get component() {
        return lookup(this.moduleName).definition;
    }

    get invokedAt() {
        return {
            filePath: lookup(this.containingTemplate.moduleName).filePath,
            position: this.astNode.loc.start
        }
    }

    get definedAt() {
        let filePath = this.templateFilePath ||
            lookup(this.moduleName).filePath;
        return {
            filePath,
            position: { line: 0, column: 0 }
        }
    }

    blockParamDefinition(index): FilePosition {
        let position = lookup(this.templateModule).definition.getYieldPosition(index)
        return {
            filePath: this.templateFilePath,
            position: position
        }
    }
}

/**
 * For now this only accounts for actions defined by
 * string literals, not bound paths
 */
export class Action extends TemplateMember<htmlBars.Callable> {
    get definedAt() {
        let contextModule = resolver.templateContext(
            this.containingTemplate.moduleName
        )

        let context = lookup(contextModule).definition as ember.EmberClass
        console.log(`looking up ${this.name} action from ${_.keys(context.actions)}`) 
        let action = context.actions[this.name]

        return {
            filePath: action.filePath,
            position: action.position
        }
    }

    get name() {
        let name = this.astNode.params[0] as htmlBars.StringLiteral;
        return name.original;
    }

}

export class Path extends TemplateMember<htmlBars.PathExpression> {
    astNode: htmlBars.PathExpression;

    get root() {
        return this.astNode.parts[0];
    }

    get definedAt() {
        let contextModule = resolver.templateContext(
            this.containingTemplate.moduleName
        )

        let context = lookup(contextModule).definition as ember.EmberClass
        let prop = context.properties[this.root];
      
        return {
            filePath: prop.filePath,
            position: prop.position

        }
    }
}

export class BlockParam extends Path {
    index;
    block: Block;

    constructor(template, node, block, index) {
        super(template, node);
        this.block = block;
        this.index = index;
    }

    get definedAt() {
        return this.block.blockParamDefinition(this.index);
    }
}

function findContainingComponent(template: Template, pathExpr) {
    const hasPath = n => n.astNode.path === pathExpr;
    return _.find(template.components, hasPath)
}

let nodeContainingPosition = (ast, position, type) => {
    return _.first(findNodes<any>(
        ast,
        type,
        n => containsPosition(n, position)
    ));
}

class NoContext {
    definition;
    moduleName;
    constructor(moduleName) {
        this.moduleName = moduleName;
    }
}
export class Template {
    moduleName: string;
    get renderingContext() {
        return lookup(resolver.templateContext(this.moduleName))
            || new NoContext(this.moduleName);
    }

    constructor(moduleName: string) {
        this.moduleName = moduleName;
    }

    _cache: {
        SubExpression: htmlBars.SubExpression[];
        MustacheStatement: htmlBars.MustacheStatement[];
        ElementModifierStatement: htmlBars.ElementModifierStatement[];
        BlockStatement: htmlBars.BlockStatement[];
        StringLiteral: htmlBars.StringLiteral[];
        PathExpression: htmlBars.PathExpression[];
        All: htmlBars.ASTNode[];
    }
    get cachedNodes() {
        if (!!this._cache) { return this._cache; }

        let cachedNodeTypes = [
            'SubExpression',
            'MustacheStatement',
            'ElementModifierStatement',
            'BlockStatement',
            'StringLiteral',
            'PathExpression'
        ];

        this._cache = {
            SubExpression: [],
            MustacheStatement: [],
            ElementModifierStatement: [],
            BlockStatement: [],
            StringLiteral: [],
            PathExpression: [],
            All: []
        };

        let nodes = findNodes<htmlBars.ASTNode>(
            this.astNode,
            'All',
            k => !!this._cache[k.type]
        );

        nodes.forEach((n) => {
            this._cache[n.type].push(n);
            this._cache['All'].push(n);
        })

        return this._cache;
    }

    get props() {
        let isHelper = (n) => {
            if (n.type === "SubExpression" ||
                n.type === "MustacheStatement" ||
                n.type === "ElementModifierStatement" ||
                n.type === "BlockStatement"
            ) {
                return n.params.length > 0 || n.hash.pairs.length > 0
            } else {
                return false;
            }
        }
        let helpers = this.cachedNodes['All'].filter(isHelper) as htmlBars.Callable[];

        let allPaths = this.cachedNodes['PathExpression'];

        let SPECIAL_PATH_NAMES = [
            "yield",
            "outlet"
        ]
        let realPaths = _(allPaths)
            .reject(p => !!findContainingComponent(this, p))
            .reject(p => !!_.find(helpers, h => h.path === p))
            .reject(p => _.includes(SPECIAL_PATH_NAMES, p.original))
            .map(p => new Path(this, p))
            .reject(p => this.blockParamFromPath(p))
            .value()

        return realPaths.reduce((accum, p) => {
            if (!accum[p.root]) { accum[p.root] = []; }

            accum[p.root].push(p.astNode.original);
            return accum;
        }, {})

    }

    get partials() {
        return (this.cachedNodes['MustacheStatement']).filter(
            n => n.path.original == 'partial'
        ).map(n => new Partial(this, n))
    }

    get actions() {
        let isActionExpr = (n) => {
            if (n.type === "SubExpression" ||
                n.type === "MustacheStatement" ||
                n.type === "ElementModifierStatement") {
                return n.path.original === "action" &&
                    n.params[0].type === "StringLiteral"
            } else {
                return false;
            }

        }
        return (this.cachedNodes['All'].filter(isActionExpr) as any[])
            .reduce((accum, node) => {
                accum[node.params[0].original] = true
                return accum
            }, {});
    }
 
    get invocations(): TemplateInvocation[] {
        return [].concat(this.partials, this.components);
    }
    get components() {
        let blockComponents = _(this.blocks).map((block) => {
            if (block instanceof ComponentInvocation) {
                return block;
            }
        }).compact().value();

        let mustacheComponents =
            (this.cachedNodes['MustacheStatement'])
                .filter(n => !!findComponent(n.path.original))
                .map(n => new ComponentInvocation(this, n));

        return blockComponents.concat(mustacheComponents);
    }

    get blocks() {
        return (this.cachedNodes['BlockStatement'])
            .map((node) => {
                if (!!findComponent(node.path.original)) {
                    return new ComponentInvocation(this, node);
                } else {
                    return new Block(this, node);
                }
            });
    }
    get filePath() {
        return lookup(this.moduleName).filePath;
    }

    _astNode: htmlBars.Program;
    get astNode() {
        if (this._astNode) { return this._astNode }
        let src = fileContents(this.moduleName);
        this._astNode = htmlBars.parse(src);
        return this._astNode;
    }

    getYieldPosition(index) {
        let yieldNode = (this.cachedNodes['MustacheStatement'])
            .filter(node => node.path.original === 'yield')[0];

        return yieldNode.params[index].loc.start;
    }

    blockParamFromPath(path: Path): BlockParam {
        let foundBlock = _.find(this.blocks, (block => {
            return containsPosition(block.astNode, path.astNode.loc.start) &&
                block.blockParams.indexOf(path.root) > -1
        }));

        if (!!foundBlock) {
            return new BlockParam(
                this,
                path.astNode,
                foundBlock,
                foundBlock.blockParams.indexOf(path.root))
        } else {
            return null;
        }
    }


    parsePosition(position: Position): Defineable {
        console.log("looking up position ", position)
        let findContainer = _.partial(nodeContainingPosition, this.astNode, position);

        let pathExpr = findContainer('PathExpression');
        let stringLiteral = findContainer('StringLiteral');
        // find mustaches and subexpressions whose path is 'action' and have this
        // string literal as the first param
        let isActionExpr = (n) => {

            if (n.type === "SubExpression" ||
                n.type === "MustacheStatement" ||
                n.type === "ElementModifierStatement") {
                return n.path.original === "action" &&
                    n.params[0] === stringLiteral
            } else {
                return false;
            }

        }
        let actionExpr = this.cachedNodes['All'].filter(isActionExpr)[0];
        if (actionExpr) {
            return new Action(this, actionExpr);
        } else if (pathExpr) {
            let component = findContainingComponent(this, pathExpr);
            let foundPath = new Path(this, pathExpr);
            return this.blockParamFromPath(foundPath) || component || foundPath;
        } else {
            // eventually this should include actions, etc.
            // for now if it's not a path we don't care
            return new NullPosition(this, position);
        }
    }
}