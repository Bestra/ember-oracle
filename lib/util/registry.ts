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

/**
 * Creates a new module for the given path
 */
export function registerPath(filePath: string) {
    let moduleName = resolver.moduleNameFromPath(filePath);
    let moduleType = moduleName.split(':')[0];
    let modulePath = moduleName.split(':')[1];
    if (registry[moduleType]) {
        registry[moduleType][modulePath] = { filePath, definition: null};
        return moduleName;
    } else {
        return null;
    }
}

export function registerAppModules() {
    let appPath = resolver.fullAppPath();
    let podPath = resolver.fullPodPath();

    let podModules = files.getFiles(podPath, ['.js', '.hbs']).map((p) => registerPath(p));
    let otherModules = [];
    _.forEach(SUPPORTED_MODULES, (fileType, moduleName) => {
        let modulePath = path.join(appPath, moduleName + 's');
        otherModules.push(files.getFiles(modulePath, [fileType]).map((p) => registerPath(p)))
    });

    return podModules.concat(_.flatten(otherModules));
}

/**
 * Only retrieve items from the registry by module name
 */
export function lookup(moduleName: string) {
    
    let moduleType = moduleName.split(':')[0];
    let modulePath = moduleName.split(':')[1];
    console.log(`registry.lookup ${moduleName} in ${JSON.stringify(registry[moduleType], null, 2)}`);
    return registry[moduleType][modulePath];
}

export function lookupPath(filePath) {
    return lookup(resolver.moduleNameFromPath(filePath));
}
/**
 * Given a name like foo/my-component
 */
export function findComponent(helperName: string) {
    return lookup(`component:${helperName}`);
};

export function fileContents(moduleName: string) {
    return readFileSync(lookup(moduleName).filePath);
}