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
export function moduleNameFromPath(filePath: string): string {
    let isPod = filePath.match(/pods/)
    if (isPod) {
        let prefix = path.basename(filePath).split('.')[0]
        let modulePath;
        if (prefix === "component") {
            modulePath = path.dirname(filePath.split('app/pods/components/')[1]);
        } else {
            modulePath = path.dirname(filePath.split('app/pods/')[1]);
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

// creates a relative path
export function createPath(isPod, moduleName) {
    let parts = moduleName.split(':');
    let prefix = parts[0];
    let segments = parts[1].split('/');
    let extension = (prefix === "template") ? ".hbs" : ".js";
    let filePath = [];
    if (isPod) {
        if (prefix === 'component') {
            filePath = [appRootName, podPrefix, "components", ...segments, (prefix + extension)]
        } else {
            filePath = [appRootName, podPrefix, ...segments, (prefix + extension)]
        }
    } else {
        let fileName = segments.pop() + extension;
        // segments could be an empty array, hence concat
        filePath = [appRootName].concat(prefix + 's', ...segments, fileName)
    }

    return filePath.join('/');
};

export function templateContext(templateModule: string): string {
    let parts = templateModule.split(':');
    let path = parts[1];
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
export function pathsFromName(moduleName: string): string[] {
    return [true, false].map((t) => createPath(t, moduleName));
};

export function filePathForModule(moduleName: string): string {
    return pathsFromName(moduleName).map(createAbsolutePath).filter(fs.existsSync)[0];
}