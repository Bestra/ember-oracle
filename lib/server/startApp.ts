import * as path from 'path';
import * as fs from 'fs';
import * as resolver from '../util/resolver'
import * as registry from '../util/registry'
import { ok } from 'assert'

export default function init(rootPath: string, enginePaths: string[] = []) {
    ok(path.isAbsolute(rootPath), "root must be an absolute path");
    resolver.setRootPath(rootPath);
    registry.registerAppModules();
    new ConfigFile(rootPath).addonPaths.forEach(p => registry.registerModules(p, "pods"));
    enginePaths.forEach(p => registry.registerModules(p, "pods"));
}

class ConfigFile {
    addonPaths;
    constructor(rootPath: string) {
        let dotFilePath = path.join(rootPath, ".ember-analyzer");
        this.addonPaths = [];
        console.log('looking for config file at ${dotFilePath}');
        if (fs.existsSync(dotFilePath)) {
            let dotInfo = JSON.parse(fs.readFileSync(dotFilePath, 'utf8'))
            console.log("addon paths found in config file:");
            console.log(dotInfo.addonPaths);
            this.addonPaths = dotInfo.addonPaths;
        } 
    }
}
