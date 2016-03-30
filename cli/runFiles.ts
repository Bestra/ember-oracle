"use strict";
import * as path from 'path'
import * as fs from 'fs'
import walkSync = require('walk-sync');

type Path = string;

function getFiles(rootDir: Path, extension: string): Array<Path> {
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

export default function() {
    let args = process.argv.slice(2);
    let dir = args[0];
    let extension = args[1];
    let handler = args[2];
    if (dir) {
        let handlerPath = path.resolve(handler);
        let handlerFn = require(handlerPath).default;
        processFiles(getFiles(dir, extension), (path, src) => {
           handlerFn(path, src);
        });
    }
}
