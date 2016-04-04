"use strict";
import * as path from 'path'
import * as fs from 'fs'
import walkSync = require('walk-sync');

type Path = string;

export function getFiles(rootDir: Path, extension: string): Array<Path> {
    if (!fs.existsSync(rootDir)) {
        return [];
    }
    return walkSync(rootDir).filter((file) => {
        return path.extname(file) === extension;
    }).map((file) => {
        return path.join(rootDir, file);
    });
};

function processFiles(filePaths: Array<Path>, handler: (path: Path, src: string) => void) {
    filePaths.forEach((p) => {
        let content = fs.readFileSync(p, 'utf8');
        handler(p, content);
    });
};