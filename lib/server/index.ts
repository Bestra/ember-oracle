import * as Koa from 'koa'
import * as Router from "koa-router";
import * as path from 'path';

import * as resolver from '../util/resolver'
import * as registry from '../util/registry'

import { Template } from '../hbs';

import { ok } from 'assert'

import init from './startApp'

export default function start(appPath: string, enginePaths: string[]) {
    let app = new Koa();
    let router = new Router();
    
    init(appPath, enginePaths);
    router.get('/', function (ctx, next) {
        ctx.body = "Hey";
    });

    router.get('/files/alternate', function (ctx, next) {
        let fullPath = path.resolve(ctx.query.path);
        let moduleName = registry.lookupModuleName(fullPath);
        console.log("looking up alternate for module ", moduleName)

        let associated = resolver.alternateModule(moduleName);
        ctx.body = registry.lookup(associated).filePath;
    });
    
    router.get('/templates/definition', function (ctx, next) {
        console.log(ctx.query);
        let fullPath = path.resolve(ctx.query.path);
        let template = registry.lookup(registry.lookupModuleName(fullPath)).definition as Template;
        
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
