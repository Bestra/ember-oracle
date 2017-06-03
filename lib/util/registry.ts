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
import { Template } from '../hbs';
import * as assert from 'assert';
import { ModuleDefinition, ModuleName, FilePath } from './types';

export type ModuleType =
  | 'component'
  | 'controller'
  | 'router'
  | 'service'
  | 'template'
  | 'route'
  | 'view'
  | 'model'
  | 'mixin';

let SUPPORTED_MODULES = {
  component: '.js',
  controller: '.js',
  router: '.js',
  service: '.js',
  template: '.hbs',
  route: '.js',
  'view:': '.js',
  model: '.js',
  mixin: '.js'
};

interface Dict<T> {
  [index: string]: T;
}

type RegistryEntry = { filePath: FilePath; definition: ModuleDefinition };

export default class Registry {
  resolver: Resolver;
  registeredFiles: Dict<ModuleName> = {};
  private registeredModules: Dict<RegistryEntry> = {};

  constructor(resolver) {
    this.resolver = resolver;
  }

  /**
     * Creates a new module for the given path
     * @param filePath 
     * @param appRoot 
     */
  registerPath(filePath: FilePath, appRoot: string) {
    let moduleName = this.resolver.moduleNameFromPath(filePath, appRoot);
    // console.log("registering ", filePath);
    this.registeredFiles[filePath] = moduleName;
    let [moduleType, modulePath] = moduleName.split(':');
    let def;
    if (moduleType === 'template') {
      def = new Template(moduleName, filePath, this);
    } else {
      def = new EmberClass(moduleName, filePath, this);
    }
    this.registeredModules[moduleName] = { filePath, definition: def };
    return moduleName;
  }

  registerManually(moduleName, filePath) {
    let manualName = <ModuleName>`imports:${moduleName}`;
    this.registeredModules[manualName] = {
      filePath,
      definition: new EmberClass(moduleName, filePath, this)
    };
    this.registeredFiles[filePath] = manualName;
  }

  /**
     * Delegates to the resolver, does not actually confirm
     * whether the context module exists
     */
  templateContext(templateModule: ModuleName): ModuleName {
    return this.resolver.templateContext(templateModule);
  }

  registerModules(rootPath, podPrefix) {
    let appPath = path.join(rootPath, 'app');

    let podPath = path.join(appPath, podPrefix);
    console.log('looking for files in ', podPath);

    let podModules = files
      .getFiles(podPath, ['.js', '.hbs'])
      .map(p => this.registerPath(p, rootPath));
    console.log(
      '    registered ',
      _.flatten(podModules).length,
      'modules in pods'
    );

    let otherModules: any[] = [];
    _.forEach(SUPPORTED_MODULES, (fileType, moduleName) => {
      let modulePath = path.join(appPath, moduleName + 's');
      console.log('looking for ', fileType, ' files in ', modulePath);
      let foundFiles = files
        .getFiles(modulePath, [fileType])
        .map(p => this.registerPath(p, rootPath));
      // console.log(foundFiles)
      otherModules.push(foundFiles);
    });
    console.log(
      '    registered ',
      _.flatten(otherModules).length,
      'other modules'
    );

    let found = podModules.concat(_.flatten(otherModules));
    console.log('    registered ', found.length, 'total modules');
    return found;
  }

  /**
     * Only retrieve items from the registry by module name.
     */
  lookup(moduleName: ModuleName): RegistryEntry {
    return this.registeredModules[moduleName];
  }

  confirmExistance(moduleName: ModuleName) {
    return this.lookup(moduleName) ? moduleName : null;
  }

  lookupByAppPath(appPath) {
    return this.lookup(this.resolver.moduleNameFromAppPath(appPath));
  }

  lookupModuleName(filePath) {
    let r = this.registeredFiles[filePath];
    assert.ok(r, `File not found at ${filePath}`);
    return this.registeredFiles[filePath];
  }
  /**
     * Given a name like foo/my-component
     * If the component is template-only (if the template is defined in the registry)
     * this function returns a null-object representing the component
     */
  findComponent(helperName: string) {
    let componentModuleName = <ModuleName>`component:${helperName}`;
    let componentTemplateModuleName = <ModuleName>`template:components/${helperName}`;

    let componentModule = this.lookup(componentModuleName);

    if (componentModule) {
      return componentModule;
    } else {
      if (this.lookup(componentTemplateModuleName)) {
        return {
          filePath: null,
          definition: new EmptyEmberClass(componentModuleName, this)
        };
      } else {
        return null;
      }
    }
  }

  fileContents(moduleName: ModuleName) {
    return readFileSync(this.lookup(moduleName).filePath, 'utf8');
  }

  allModules(desiredType?: ModuleType): RegistryEntry[] {
    if (desiredType) {
      return _.filter(this.registeredModules, (v, key) => {
        let type = key!.split(':')[0];
        return type === desiredType;
      });
    } else {
      return _.values(this.registeredModules);
    }
  }

  allEmberModules() {
    return _([
      'component',
      'controller',
      'router',
      'service',
      'route',
      'view',
      'model',
      'mixin'
    ])
      .map(t => {
        return this.allModules(<ModuleType>t).map(m => m.definition);
      })
      .flatten()
      .value() as EmberClass[];
  }

  moduleNames(type: ModuleType) {
    return _.map(this.allModules(type), (val, key) => {
      return val.definition.moduleName.split(':')[1];
    });
  }
}
