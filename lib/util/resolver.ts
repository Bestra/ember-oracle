import * as fs from 'fs'
import * as path from 'path'

// yes it's an incredibly naive version of the ember resolver.

const podRoot = "app/pods";
const appRoot = "app";

export function moduleNameFromPath(filePath: string): string {
    return "foo"
};


export function createPath(isPod, moduleName) {
    let parts = moduleName.split(':');
    let prefix  = parts[0];
    let segments = parts[1].split('/');
    let extension = (prefix === "template") ? ".hbs" : ".js";
    let filePath = [];
    if (isPod) {
        if (prefix === 'component') {
            filePath = [podRoot, "components", ...segments, (prefix + extension)]
        } else {
            filePath = [podRoot, ...segments, (prefix + extension)]
        }
    } else {
        let fileName = segments.pop() + extension;
        // segments could be an empty array, hence concat
        filePath = [appRoot].concat(prefix + 's', ...segments, fileName)
    }
    
    return filePath.join('/');
}

export function templateContext(templateModule: string): string {
    let parts = templateModule.split(':');
    let path  = parts[1];
    let newRoot = path.match("components") ? "component:" : "controller:";
    return newRoot + path; 
}

export function pathsFromName(moduleName: string): string[] {
    return [true, false].map((t) => createPath(t, moduleName));

 };