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
import { EmberClass, EmptyEmberClass } from '../ember';
import { Template } from '../hbs'
import * as assert from 'assert';

let SUPPORTED_MODULES = {
    'component': '.js',
    'controller': '.js',
    'router': '.js',
    'service': '.js',
    'template': '.hbs',
    'route': '.js',
    'view:': '.js',
    'mixin': '.js'
};

interface Dict<T> {
    [index: string]: T
}

type RegistryEntry = { filePath; definition; };
type RegistryType = Dict<RegistryEntry>;

let registry: Dict<RegistryType> = {
    component: {},
    controller: {},
    router: {},
    service: {},
    template: {},
    route: {},
    view: {},
    mixin: {}
};

let registeredFiles: Dict<string> = {};
export {registry};
/**
 * Creates a new module for the given path
 */
export function registerPath(filePath: string, appRoot: string) {
    let moduleName = resolver.moduleNameFromPath(filePath, appRoot);
    // console.log("registering ", filePath);
    registeredFiles[filePath] = moduleName;
    let [moduleType, modulePath] = moduleName.split(':');
    if (registry[moduleType]) {
        let def;
        if (moduleType === 'template') {
            def = new Template(moduleName, filePath);
        } else {
            def = new EmberClass(moduleName, filePath);
        }
        registry[moduleType][modulePath] = { filePath, definition: def };
        return moduleName;
    } else {
        return null;
    }
}

export function registerManually(moduleName, filePath) {
    registry['imports'][moduleName] = { filePath, definition: new EmberClass(moduleName, filePath) }
}

export function registerModules(rootPath, podPrefix) {
    let appPath = path.join(rootPath, "app");

    let podPath = path.join(appPath, podPrefix);
    console.log("looking for files in ", podPath);

    let podModules = files.getFiles(podPath, ['.js', '.hbs']).map(p => registerPath(p, rootPath));
    console.log("    registered ", _.flatten(podModules).length, "modules in pods")

    let otherModules = [];
    _.forEach(SUPPORTED_MODULES, (fileType, moduleName) => {
        let modulePath = path.join(appPath, moduleName + 's');
        console.log("looking for ", fileType, " files in ", modulePath)
        let foundFiles = files.getFiles(modulePath, [fileType]).map(p => registerPath(p, rootPath))
        // console.log(foundFiles)
        otherModules.push(foundFiles);
    });
    console.log("    registered ", _.flatten(otherModules).length, "other modules")

    let found = podModules.concat(_.flatten(otherModules));
    console.log("    registered ", found.length, "total modules")
    return found;
}


/**
 * Only retrieve items from the registry by module name.
 */
export function lookup(moduleName: string) {
    let [moduleType, modulePath] = moduleName.split(':');
    let modules = registry[moduleType];

    assert.ok(modules, `modules for type: ${moduleType} should exist`);
    return registry[moduleType][modulePath];

}

export function lookupByAppPath(appPath) {
    return lookup(resolver.moduleNameFromAppPath(appPath));
}

export function lookupModuleName(filePath) {
    let r = registeredFiles[filePath];
    assert.ok(r, `File not found at ${filePath}`);
    return registeredFiles[filePath];
};

/**
 * Given a name like foo/my-component
 * If the component is template-only (if the template is defined in the registry)
 * this function returns a null-object representing the component
 */
export function findComponent(helperName: string) {
    let componentModuleName = `component:${helperName}`;
    let componentTemplateModuleName = `template:components/${helperName}`;

    let componentModule = lookup(componentModuleName);

    if (componentModule) {
        return componentModule
    } else {
        if (lookup(componentTemplateModuleName)) {
            return {
                filePath: null,
                definition: new EmptyEmberClass(componentModuleName)
            }
        } else {
            return null;
        }
    }
};

export function fileContents(moduleName: string) {
    return readFileSync(lookup(moduleName).filePath, 'utf8');
}

export function allModules(type: string) {
    return registry[type];
}

export function moduleNames(type: string) {
    return _.map(allModules(type), (val, key) => {
        return val.definition.moduleName.split(':')[1];
    });
}