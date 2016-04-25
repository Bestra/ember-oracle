import * as path from 'path';
import * as resolver from '../util/resolver'
import * as registry from '../util/registry'
import { ok } from 'assert'

export default function init(appPath: string, enginePaths: string[] = []) {
    ok(path.isAbsolute(appPath), "app root must be an absolute path");
    resolver.setRootPath(appPath);
    registry.registerAppModules();
    enginePaths.forEach(p => registry.registerModules(p, "pods"));
}