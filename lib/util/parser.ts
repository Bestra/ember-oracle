import * as path from 'path'
import * as recast from 'recast'
import * as fs from 'fs'
import * as _ from 'lodash'
import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'

let babel = require('babel-core');

export default function parseFile(filePath) {
    let src = fs.readFileSync(filePath, 'utf8');
    if (path.extname(filePath) === '.js') {
        return recast.parse(src, { esprima: babel });
    } else {
        return htmlBars.parse(src); 
    }
}