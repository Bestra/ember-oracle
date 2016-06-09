import * as fs from 'fs'
import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as path from 'path'
import * as recast from 'recast'

let babel = require('babel-core');

export function parseJs(src) {
    return recast.parse(src, { esprima: babel });
}

export function parseHbs(src) {
    return htmlBars.parse(src);
}

export default function parseFile(aPath) {
    let src = fs.readFileSync(aPath, 'utf8');
    let extension = path.extname(aPath);
    if (extension === '.js') {
        return parseJs(src);
    } else if (extension === '.hbs') {
        return parseHbs(src);
    }
}