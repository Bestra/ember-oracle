/**
 * A variable of any kind in the template
 */

import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as path from 'path'
import * as fs from 'fs'

import * as resolver from '../util/resolver'

export interface Template {
    filePath;
    source;
}

function withinBlock(block: htmlBars.BlockStatement, position: htmlBars.Position): boolean {
    return block.loc.start.line < position.line && block.loc.end.line > position.line;
}

export interface PathSource {
    name;
    sourceModule;
};
export interface BlockParam extends PathSource {
    block: htmlBars.BlockStatement;
    index;
};

function isComponent(path: string): boolean {
    return !!path.match(/-/);
};

function findBlockModule(block?: htmlBars.BlockStatement): string {
    if (block) {
        let pathString = block.path.original;
        if (isComponent(pathString)) {
            return "template:components/" + pathString;
        } else { return null; }
    } else {
        return null;
    }
};

export function extractBlockParam(template: Template, pathName: string, position: htmlBars.Position): BlockParam {
    let ast = htmlBars.parse(template.source);
    let blocks: htmlBars.BlockStatement[] = [];
    htmlBars.traverse(ast, {
        BlockStatement: {
            enter(node: htmlBars.BlockStatement) {
                blocks.push(node);
            }
        }
    });
    return blocks
        .filter(block => withinBlock(block, position))
        .map(block => {
            console.log(pathName);
            return {
                name: pathName,
                block,
                index: block.program.blockParams.indexOf(pathName),
                sourceModule: findBlockModule(block)
            };
        }).find(param => param.index > -1);
}

export default function findPathDefinition(template: Template, variableName: string, pos: htmlBars.Position): PathSource {
    let blockParam = extractBlockParam(template, variableName, pos);

    if (blockParam) {
        return blockParam;
    } else {
        let templateModule = resolver.moduleNameFromPath(template.filePath);
        let templateContextModule = resolver.templateContext(templateModule);
        return { name: variableName, sourceModule: templateContextModule };
    }
}