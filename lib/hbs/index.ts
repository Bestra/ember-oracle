/**
 * A variable of any kind in the template
 */

import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as path from 'path'
import * as fs from 'fs'
import {Template, BlockParam, PathSource} from './types'

import * as resolver from '../util/resolver'

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

export function extractBlockParam(template: Template, pathName: string, position: htmlBars.Position): BlockParam {
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
        .filter(block => withinBlock(block, position))
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

interface SourceLocation {
    filePath: string;
    loc: { line: number, column: number };
}

function isBlockParam(src: PathSource): src is BlockParam {
    return src.type === "BlockParam"
}


function findYieldLocation(blockParam: BlockParam) {
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

function findLocationInFile(varToFind: PathSource) {
    console.log(varToFind);
    if (isBlockParam(varToFind)) {
        if (varToFind.isYielded) {
            console.log("yielded");
            return findYieldLocation(varToFind);
            // find the yield expression in the source template
        } else {
            // find the block expression in the source template
            console.log("loc is", varToFind.blockNode.loc);
            return { filePath: resolver.filePathForModule(varToFind.sourceModule), loc: varToFind.blockNode.loc.start }
        }
    } else {
        console.log("find controller ", varToFind.sourceModule);
        // call the findAttr function or something with the path's context.
         return { filePath: resolver.filePathForModule(varToFind.sourceModule), loc: {line: 0, column: 0} }
    }


}

export function findDefinition(template: Template, variableName: string, pos: htmlBars.Position) {
    return findLocationInFile(findPathDefinition(template, variableName, pos))
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

