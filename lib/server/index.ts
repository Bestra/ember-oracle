import * as Koa from 'koa'
import * as Router from "koa-router";
import * as path from 'path';
import * as fs from 'fs';

import * as resolver from '../util/resolver'
import * as registry from '../util/registry'

import { Template } from '../hbs';

import { ok } from 'assert'
export default function start(appPath: string, enginePaths: string[]) {
    ok(path.isAbsolute(appPath), "app root must be an absolute path");
    resolver.setRootPath(appPath);
    let appDir = path.join(appPath, resolver.appRootName);
    let app = new Koa();
    let router = new Router();
    
    let mods = registry.registerAppModules();
    enginePaths.forEach(p => registry.registerModules(p, "pods"));
    router.get('/', function (ctx, next) {
        ctx.body = "Hey";
    });

    router.get('/files/alternate', function (ctx, next) {
        let fullPath = path.resolve(ctx.query.path);
        let moduleName = resolver.moduleNameFromPath(fullPath);
        console.log("looking up alternate for module ", moduleName)

        let associated = resolver.alternateModule(moduleName);
        ctx.body = registry.lookup(associated).filePath;
    });
    
    router.get('/templates/definition', function (ctx, next) {
        console.log(ctx.query);
        let fullPath = path.resolve(ctx.query.path);
        let template = new Template(resolver.moduleNameFromPath(fullPath));
        
        let queryPosition = { line: parseInt(ctx.query.line), column: parseInt(ctx.query.column) };
        let defineable = template.parsePosition(queryPosition);
        let position = defineable.definedAt
        if (ctx.query.format === "compact") {
            ctx.body = [position.filePath, position.position.line, position.position.column].join(':');
        } else {
            ctx.body = JSON.stringify(position);
        }
    });

    app.use(router.routes())
        .use(router.allowedMethods());

    app.listen(5300);
    console.log("server listening on port 5300")
}
