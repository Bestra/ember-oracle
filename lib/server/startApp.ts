import * as path from 'path';
import * as fs from 'fs';
import Resolver from '../util/resolver'
import Registry from '../util/registry'
import { ok } from 'assert'

export default class Application {
    resolver: Resolver;
    registry: Registry;
    constructor(resolver: Resolver, registry: Registry) {
        this.resolver = resolver;
        this.registry = registry;
    }
    init(aPath: string, enginePaths: string[] = []) {
        let rootPath = path.resolve(aPath);
        console.log("Running ember-oracle on ", rootPath);
        this.resolver.rootPath = rootPath;
        this.registry.registerModules(rootPath, "pods");
        new ConfigFile(rootPath).addonPaths.forEach(p => {
            console.log("registering modules in ", p)
            this.registry.registerModules(p, "pods")
        });
        enginePaths.forEach(p => {

            this.registry.registerModules(p, "pods");
        });
    }

}
class ConfigFile {
    addonPaths;
    constructor(rootPath: string) {
        let dotFilePath = path.join(rootPath, ".ember-oracle");
        this.addonPaths = [];
        console.log(`looking for config file at ${dotFilePath}`);
        if (fs.existsSync(dotFilePath)) {
            let dotInfo = JSON.parse(fs.readFileSync(dotFilePath, 'utf8'))
            console.log("addon paths found in config file:");
            console.log(dotInfo.addonPaths);
            this.addonPaths = dotInfo.addonPaths.map(p => {
                return path.resolve(dotFilePath, p);
            });
        }
    }
}
