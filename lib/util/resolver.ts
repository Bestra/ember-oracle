import * as fs from 'fs'
import * as path from 'path'
import * as files from '../util/files'
import * as assert from 'assert'
// yes it's an incredibly naive version of the ember resolver.

export let podPrefix = "pods";
export let appRootName = "app";
export let appName = "app" // this is renamed based on the app name in the ember project's cli config
export let rootPath = ""; // set by the server

function singularize(str: string) {
    return str.slice(0, str.length - 1);
};

export function fullAppPath() {
    return path.join(rootPath, appRootName);
}

export function fullPodPath() {
    return path.join(rootPath, appRootName, podPrefix);
}

/**
 * Translates a path like 'my-app/mixins/models/foo' to a real path in the file system.
 * For now this will won't pick up engine paths
 */
export function filePathFromAppPath(inPath: string) {
    let parts = inPath.split('/')
    parts[0] = 'app';
    return path.join(rootPath, parts.join('/') + '.js');
}

export function moduleNameFromAppPath(inPath: string) {
    return moduleNameFromPath(filePathFromAppPath(inPath), rootPath);
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
        var parts = filePath.split(/[\/\.]/);
        if (parts[0] === 'app') {
            parts = parts.slice(1);
        }
        let prefix = singularize(parts[0]);
        let modulePath = parts.slice(1, -1);

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