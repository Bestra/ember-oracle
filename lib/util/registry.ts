/**
 * The in-memory mapping of module names to filepaths and definitions
 * 
 */

import Resolver from './resolver';
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

export default class Registry {
    resolver: Resolver;
    registeredFiles: Dict<string> = {};
    registeredModules: Dict<RegistryType> = {
        component: {},
        controller: {},
        router: {},
        service: {},
        template: {},
        route: {},
        view: {},
        mixin: {}
    }

    constructor(resolver) {
        this.resolver = resolver;
    }
    
    /**
     * Creates a new module for the given path
     * @param filePath 
     * @param appRoot 
     */
    registerPath(filePath: string, appRoot: string) {
        let moduleName = this.resolver.moduleNameFromPath(filePath, appRoot);
        // console.log("registering ", filePath);
        this.registeredFiles[filePath] = moduleName;
        let [moduleType, modulePath] = moduleName.split(':');
        if (this.registeredModules[moduleType]) {
            let def;
            if (moduleType === 'template') {
                def = new Template(moduleName, filePath, this);
            } else {
                def = new EmberClass(moduleName, filePath, this);
            }
            this.registeredModules[moduleType][modulePath] = { filePath, definition: def };
            return moduleName;
        } else {
            return null;
        }
    }
    registerManually(moduleName, filePath) {
        this.registeredModules['imports'][moduleName] = { filePath, definition: new EmberClass(moduleName, filePath, this) }
    }

    registerModules(rootPath, podPrefix) {
        let appPath = path.join(rootPath, "app");

        let podPath = path.join(appPath, podPrefix);
        console.log("looking for files in ", podPath);

        let podModules = files.getFiles(podPath, ['.js', '.hbs']).map(p => this.registerPath(p, rootPath));
        console.log("    registered ", _.flatten(podModules).length, "modules in pods")

        let otherModules: any[] = [];
        _.forEach(SUPPORTED_MODULES, (fileType, moduleName) => {
            let modulePath = path.join(appPath, moduleName + 's');
            console.log("looking for ", fileType, " files in ", modulePath)
            let foundFiles = files.getFiles(modulePath, [fileType]).map(p => this.registerPath(p, rootPath))
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
    lookup(moduleName: string) {
        let [moduleType, modulePath] = moduleName.split(':');
        let modules = this.registeredModules[moduleType];

        assert.ok(modules, `modules for type: ${moduleType} should exist`);
        return this.registeredModules[moduleType][modulePath];

    }

    lookupByAppPath(appPath) {
        return this.lookup(this.resolver.moduleNameFromAppPath(appPath));
    }

    lookupModuleName(filePath) {
        let r = this.registeredFiles[filePath];
        assert.ok(r, `File not found at ${filePath}`);
        return this.registeredFiles[filePath];
    };
    /**
     * Given a name like foo/my-component
     * If the component is template-only (if the template is defined in the registry)
     * this function returns a null-object representing the component
     */
    findComponent(helperName: string) {
        let componentModuleName = `component:${helperName}`;
        let componentTemplateModuleName = `template:components/${helperName}`;

        let componentModule = this.lookup(componentModuleName);

        if (componentModule) {
            return componentModule
        } else {
            if (this.lookup(componentTemplateModuleName)) {
                return {
                    filePath: null,
                    definition: new EmptyEmberClass(componentModuleName, this)
                }
            } else {
                return null;
            }
        }
    };

    fileContents(moduleName: string) {
        return readFileSync(this.lookup(moduleName).filePath, 'utf8');
    }

    allModules(type: string) {
        return this.registeredModules[type];
    }

    moduleNames(type: string) {
        return _.map(this.allModules(type), (val, key) => {
            return val.definition.moduleName.split(':')[1];
        });
    }
}




