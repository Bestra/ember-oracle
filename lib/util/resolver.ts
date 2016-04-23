import * as fs from 'fs'
import * as path from 'path'
import * as files from '../util/files'
import * as assert from 'assert'
// yes it's an incredibly naive version of the ember resolver.

export let podPrefix = "pods";
export let appRootName = "app";
export let rootPath = ""; // this will need to allow for engines later

function singularize(str: string) {
    return str.slice(0, str.length - 1);
};

export function fullAppPath() {
    return path.join(rootPath, appRootName);
}

export function fullPodPath() {
    return path.join(rootPath, appRootName, podPrefix);
}

// Note that all paths should be relative starting with appRootName
export function moduleNameFromPath(absoluteFilePath: string, rootPath: string): string {
    let filePath = absoluteFilePath.split(rootPath)[1];
    
    let isPod = filePath.match(/pods/)
    if (isPod) {
        let prefix = path.basename(filePath).split('.')[0]
        let modulePath;
        if (prefix === "component") {
            modulePath = path.dirname(filePath.split('pods/components/')[1]);
        } else {
            modulePath = path.dirname(filePath.split('pods/')[1]);
        }
        return prefix + ':' + modulePath;

    } else {
        //assuming segments like 'app/routes/foo/bar.js'
        let parts = filePath.split(/[\/\.]/);
        let prefix = singularize(parts[1]);
        let modulePath = parts.slice(2, -1);

        return prefix + ":" + modulePath.join('/');
    }
};

export function associatedTemplate(moduleName: string) {
    let [root, path] = moduleName.split(':');
    let newRoot = "template:"
    if (root === "controller") {
        return newRoot + path;
    } else if (root === "component") {
        return newRoot + "components/" + path;
    } else {
        return null;
    }
}

export function alternateModule(moduleName) {
    let [root, path] = moduleName.split(':');
    if (root === "template") {
        return templateContext(moduleName)
    } else {
        return associatedTemplate(moduleName)
    }
}

export function templateContext(templateModule: string): string {
    let [_root, path] = templateModule.split(':');
    let newRoot = path.match("components") ? "component:" : "controller:";
    return newRoot + path.replace("components/","");
};

export function componentTemplate(componentModule: string) {
    return `template:components/${componentModule}`;
}

export function setRootPath(aPath: string) {
    rootPath = aPath;
}

export function createAbsolutePath(relativePath: string) {
    assert.notEqual(rootPath, '', "resolver.appRootPath must be set");
    return path.join(rootPath, relativePath);
}