import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as path from 'path'
import * as fs from 'fs'
import * as ember from '../ember'
import * as resolver from '../util/resolver'
import {findComponent, lookup, fileContents} from '../util/registry'
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
    template: Template;
    position: Position;

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
            position: new Template(this.templateModule).getYieldPosition(index)
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

    constructor(template, node, block, index) {
        super(template, node);
        this.block = block;
        this.index = index;
    }

    get definedAt() {
        return this.block.blockParamDefinition(this.index);
    }
}

export class Template {
    moduleName: string;

    constructor(moduleName: string) {
        this.moduleName = moduleName;
    }

    get components() {
        let blockComponents = this.blocks.filter((block) => {
            return block instanceof ComponentInvocation
        });

        let mustacheComponents = findNodes<htmlBars.MustacheStatement>(
            this.astNode,
            'MustacheStatement',
            n => !!findComponent(n.path.original)
        ).map(n => new ComponentInvocation(this, n));

        return blockComponents.concat(mustacheComponents);
    }

    get blocks() {
        return findNodes<htmlBars.BlockStatement>(this.astNode, 'BlockStatement', () => true)
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

    _astNode;
    get astNode() {
        if (this._astNode) { return this._astNode }

        let src = fileContents(this.moduleName);
        this._astNode = htmlBars.parse(src);
        return this._astNode;
    }


    getYieldPosition(index) {
        let yieldNode = findNodes<htmlBars.MustacheStatement>(
            this.astNode,
            'MustacheStatement',
            node => node.path.original === 'yield'
        )[0];
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
        // check in order of likelihood
        // is it a path?
        // if it's not, return a NullLocation
        // if it is, check if it's a blockParam
        let pathExpr = findNodes<htmlBars.PathExpression>(
            this.astNode,
            'PathExpression',
            (node) => {
                return containsPosition(node, position)
            }
        )[0];
        if (pathExpr) {
            let foundPath = new Path(this, pathExpr);
            return this.blockParamFromPath(foundPath) || foundPath;
        } else {
            // eventually this should include actions, etc.
            // for now if it's not a path we don't care
            return new NullPosition(this, position);
        }
    }
}