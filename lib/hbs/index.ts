/**
 * A variable of any kind in the template
 */

import { parse } from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as path from 'path'
import * as fs from 'fs'

interface Location {
    filePath;
    line;
    column;    
}

interface YieldedVariableDef {
    
}

interface BlockParamDef {
    
}

export interface Template {
    filePath;
    source;
}

//block params' context is really the block helper's template
//if it's not a block param the component's context is the template it's rendered in.

function parseVariableDef(ast: any, name: string, location: Location): YieldedVariableDef | BlockParamDef {
    
    
}
export default function findDefinition(template: Template, variableName: string, sourceLine: number): Location {
    
    
    return {filePath: template.filePath, line: sourceLine, column: 0};
}