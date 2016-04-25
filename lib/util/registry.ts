/**
 * The in-memory mapping of module names to filepaths and definitions
 * 
 */

import * as resolver from './resolver';
import * as files from './files';
import * as _ from 'lodash';
import * as path from 'path';
import * as util from 'util';
import { readFileSync } from 'fs';
import { EmberClass } from '../ember';
import { Template } from '../hbs'

let SUPPORTED_MODULES = {
    'component': '.js',
    'controller': '.js',
    'router': '.js',
    'service': '.js',
    'template': '.hbs',
    'route': '.js',
    'view:': '.js'
};

interface Dict<T> {
    [index: string]: T
}

type RegistryEntry = { filePath; definition };
type RegistryType = Dict<RegistryEntry>;

let registry: Dict<RegistryType> = {
    component: {},
    controller: {},
    router: {},
    service: {},
    template: {},
    route: {},
    view: {}
};

let registeredFiles: Dict<string> = {};
export {registry} ;
/**
 * Creates a new module for the given path
 */
export function registerPath(filePath: string, appRoot: string) {
    let moduleName = resolver.moduleNameFromPath(filePath, appRoot);
    registeredFiles[filePath] = moduleName;
    let [moduleType, modulePath] = moduleName.split(':');
    if (registry[moduleType]) {
        let def;
        if (moduleType === 'template') {
            def = new Template(moduleName);
        } else {
            def = new EmberClass(moduleName);
        }
        registry[moduleType][modulePath] = { filePath, definition: def };
        return moduleName;
    } else {
        return null;
    }
}

export function registerAppModules() {
    let appPath = resolver.fullAppPath();
    return registerModules(resolver.fullAppPath() + "/", resolver.podPrefix)
}

export function registerModules(rootPath, podPrefix) {
    let appPath = rootPath;

    let podPath = path.join(rootPath, podPrefix);

    let podModules = files.getFiles(podPath, ['.js', '.hbs']).map(p => registerPath(p, rootPath));
    console.log("    registered ", _.flatten(podModules).length, "modules in pods")

    let otherModules = [];
    _.forEach(SUPPORTED_MODULES, (fileType, moduleName) => {
        let modulePath = path.join(appPath, moduleName + 's');
        console.log("looking for ", fileType, " files in ", modulePath)
        let foundFiles = files.getFiles(modulePath, [fileType]).map(p => registerPath(p, rootPath))
        console.log(foundFiles)
        otherModules.push(foundFiles);
    });
    console.log("    registered ", _.flatten(otherModules).length, "other modules")

    let found = podModules.concat(_.flatten(otherModules));
    console.log("    registered ", found.length, "total modules")
    return found;
}



/**
 * Only retrieve items from the registry by module name
 */
export function lookup(moduleName: string) {

    let moduleType = moduleName.split(':')[0];
    let modulePath = moduleName.split(':')[1];
    return registry[moduleType][modulePath];
}

export function lookupModuleName(filePath) {
    return registeredFiles[filePath];
};
/**
 * Given a name like foo/my-component
 */
export function findComponent(helperName: string) {
    return lookup(`component:${helperName}`);
};

export function fileContents(moduleName: string) {
    return readFileSync(lookup(moduleName).filePath, 'utf8');
}

export function allModules(type: string) {
    return registry[type];
}