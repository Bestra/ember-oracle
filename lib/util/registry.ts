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

type RegistryEntry = {filePath; definition};
type RegistryType = Dict<RegistryEntry>;

let registry: Dict<RegistryType>  = {
    component: {},
    controller: {},
    router: {},
    service: {},
    template: {},
    route: {},
    view: {}
};

let registeredFiles: Dict<string> = {};

/**
 * Creates a new module for the given path
 */
export function registerPath(filePath: string, appRoot: string) {
    let moduleName = resolver.moduleNameFromPath(filePath, appRoot);
    console.log('registering ', moduleName)
    registeredFiles[filePath] = moduleName; 
    let [moduleType, modulePath] = moduleName.split(':');
    if (registry[moduleType]) {
        registry[moduleType][modulePath] = { filePath, definition: null};
        return moduleName;
    } else {
        return null;
    }
}

export function registerAppModules() {
    let appPath = resolver.fullAppPath();
    return registerModules(resolver.fullAppPath(), resolver.podPrefix)
}

export function registerModules(rootPath, podPrefix) {
    console.log("registering modules in ", rootPath)

    let appPath = rootPath;
    
    let podPath = path.join(rootPath,podPrefix);

    let podModules = files.getFiles(podPath, ['.js', '.hbs']).map(p => registerPath(p, rootPath));
    console.log("    registered ", podModules.length, "pod modules")
    let otherModules = [];
    _.forEach(SUPPORTED_MODULES, (fileType, moduleName) => {
        let modulePath = path.join(appPath, moduleName + 's');
        otherModules.push(files.getFiles(modulePath, [fileType]).map(p => registerPath(p, rootPath)))
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
    console.log("looking up file contents for ", moduleName);
    console.log("path is ", lookup(moduleName).filePath)
    return readFileSync(lookup(moduleName).filePath, 'utf8');
}