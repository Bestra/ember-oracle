/**
 * A variable of any kind in the template
 */

import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as path from 'path'
import * as fs from 'fs'

export interface Template {
    filePath;
    source;
}

//block params' context is really the block helper's template
//if it's not a block param the component's context is the template it's rendered in.
//1. walk Program nodes and get their block params
//2. walk PathExpression nodes.
//3. if our variable is a pathexpression whose parts contain a block param do something
//4. otherwise do something else
function parseVariableDef(ast: htmlBars.Program, name: string, position: htmlBars.Position): any {
    htmlBars.traverse(ast, {
        Program: {
            enter(node) {
                
            }
        }
    })
    
}
export default function findDefinition(template: Template, variableName: string, sourceLine: number): any {
    
    
    return {filePath: template.filePath, line: sourceLine, column: 0};
}