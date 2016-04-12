"use strict";
import * as path from 'path'
import * as fs from 'fs'
import walkSync = require('walk-sync')
import { ok } from 'assert'
type Path = string;

let cache = {};
let cacheRoots = {};
function pushToBucket(obj, key, item) {
    if (!Array.isArray(obj[key])) {
        obj[key] = []
    } else {
        obj[key].push(item);
    }
}

function findInBucket(obj, key, item) {
   if (!Array.isArray(obj[key])) {
        return false;
    } else {
        console.log("looking for ", item);
        let found = obj[key].indexOf(item) > -1;
        
        console.log ("found? ", found);
        return found;
    }
}

export function cachePaths(rootDir: Path, extension: string) {
    getFiles(rootDir, extension, true);
}

export function getFiles(rootDir: Path, extension: string, cachePaths?: boolean): Array<Path> {
    if (!fs.existsSync(rootDir)) {
        return [];
    }
    let paths = walkSync(rootDir).filter((file) => {
        return path.extname(file) === extension;
    }).map((file) => {
        return path.join(rootDir, file);
    })
    
    if (cachePaths) {
        cache[extension] = paths
        pushToBucket(cacheRoots, extension, rootDir);
    };
};

export function exists(fullPath: string) {
    ok(path.isAbsolute(fullPath), "app root must be an absolute path");

    let ext = path.extname(fullPath);
    return findInBucket(cache, ext, fullPath);
}


function processFiles(filePaths: Array<Path>, handler: (path: Path, src: string) => void) {
    filePaths.forEach((p) => {
        let content = fs.readFileSync(p, 'utf8');
        handler(p, content);
    });
};