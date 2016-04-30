"use strict";
import * as path from 'path'
import * as fs from 'fs'
import walkSync = require('walk-sync')
import * as resolver from './resolver'

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

export function getAppFile(appPath: string) {
    
}