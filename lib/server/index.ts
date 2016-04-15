import * as Koa from 'koa'
import * as Router from "koa-router";
import * as path from 'path';
import * as fs from 'fs';

import * as resolver from '../util/resolver'
import * as registry from '../util/registry'

import defineComponents from '../components/';
import { findDefinition } from '../hbs';

import { ok } from 'assert'
export default function start(appPath: string) {
    ok(path.isAbsolute(appPath), "app root must be an absolute path");
    resolver.setRootPath(appPath);
    let appDir = path.join(appPath, resolver.appRootName);
    let app = new Koa();
    let router = new Router();

    let components = [] //defineComponents(appRoot);
    
    registry.registerAppModules();
    
    router.get('/', function(ctx, next) {
        ctx.body = "Hey";
    });
    
    router.get('/components', function(ctx, next) {
        ctx.body = components.map((c) => c.name).toString();
    });

    router.get('/components/:name', function(ctx, next) {
        ctx.body = JSON.stringify(components.find((c) => c.name === ctx.params.name));
    });

    router.get('/templates/definition', function(ctx, next) {
        console.log(ctx.query);
        let fullPath = path.resolve(ctx.query.path);
        let src = fs.readFileSync(fullPath, 'utf8');
        ctx.body = JSON.stringify(
            findDefinition(
                { filePath: fullPath, source: src },
                ctx.query.name,
                {line: ctx.query.line, column: ctx.query.column}
            )
        );
    });

    app.use(router.routes())
        .use(router.allowedMethods());

    app.listen(5300);
    console.log("server listening on port 5300")
}
