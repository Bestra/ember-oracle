import * as fs from 'fs';
import * as path from 'path';
import * as recast from 'recast';

let babel = require('babel-core');

export function parseJs(src) {
  return recast.parse(src, { esprima: babel });
}