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
export interface Template {
    filePath;
    source;
}

export default function findDefinition(template: Template, variableName: string, sourceLine: number): Location {
    return {filePath: template.filePath, line: sourceLine, column: 0};
}