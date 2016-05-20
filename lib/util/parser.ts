import * as path from 'path'
import * as recast from 'recast'
import * as fs from 'fs'
import * as _ from 'lodash'
import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'

let babel = require('babel-core');

export function parseJs(src) {
    return recast.parse(src, { esprima: babel });
}

export default function parseHbs(src) {
    return htmlBars.parse(src);
}