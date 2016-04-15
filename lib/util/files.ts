"use strict";
import * as path from 'path'
import * as fs from 'fs'
import walkSync = require('walk-sync')

export function getFiles(rootDir: string, extensions: string[]) {
    if (!fs.existsSync(rootDir)) {
        return [];
    }
    return walkSync(rootDir).filter((file) => {
        return extensions.indexOf(path.extname(file)) > -1;
    }).map((file) => {
        return path.join(rootDir, file);
    })
}

function processFiles(filePaths: Array<string>, handler: (path: string, src: string) => void) {
    filePaths.forEach((p) => {
        let content = fs.readFileSync(p, 'utf8');
        handler(p, content);
    });
}