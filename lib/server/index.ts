import * as Koa from 'koa'
import * as Router from "koa-router";
import * as path from 'path';
import * as childProcess from 'child_process';

import * as resolver from '../util/resolver'
import * as registry from '../util/registry'
import * as callGraph from '../util/callGraph'
import parser from '../util/parser';
import * as _ from 'lodash'
import * as check from '../check'

import { Template } from '../hbs';

import { ok } from 'assert'

import init from './startApp'

let lookupFile = _.flow(path.resolve, registry.lookupModuleName);

export default function start(appPath: string, enginePaths: string[]) {
    let app = new Koa();
    let router = new Router();

    let t1 = Date.now();
    init(appPath, enginePaths);
    let t2 = Date.now();
    callGraph.init();
    callGraph.createGraph();
    let t3 = Date.now();


    console.log("init in ", t2 - t1);
    console.log("graph in ", t3 - t2);
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

    router.get('/modules', function (ctx, next) {
        let type = ctx.query.type;
        ctx.body = registry.moduleNames(type).join('\n');
    });

    router.get('/module', function (ctx, next) {
        let moduleName = ctx.query.moduleName;
        console.log("looking up filepath for module ", moduleName);
        ctx.body = registry.lookup(moduleName).definition.filePath;
    });

    router.get('/templates/definition', function (ctx, next) {
        console.log(ctx.query);
        let fullPath = path.resolve(ctx.query.path);
        let template = registry.lookup(registry.lookupModuleName(fullPath)).definition as Template;

        let queryPosition = { line: parseInt(ctx.query.line), column: parseInt(ctx.query.column) };
        let defineable = template.parsePosition(queryPosition);
        let position = defineable.definedAt
        console.log("found position: ", JSON.stringify(position))
        if (ctx.query.format === "compact") {
            ctx.body = [position.filePath, position.position.line, position.position.column].join(':');
        } else {
            ctx.body = JSON.stringify(position);
        }
    });

    router.get('/templates/parents', function (ctx, next) {
        console.log(ctx.query);
        // TODO: change callgraph to work off templates first rather than context
        let findParents = (templateModule: string) => {
            let m = registry.lookupModuleName(templateModule);
            let context = resolver.templateContext(m);
            let caller = registry.lookup(context) ? context : m;
            console.log("looking up parents for ", caller)
            return callGraph.parentTemplates(caller);
        }
        
        let fullPath = path.resolve(ctx.query.path);

        let parents = findParents(fullPath);
        if (ctx.query.format === "compact") {
            ctx.body = parents.join('\n');
        } else {
            ctx.body = JSON.stringify(parents);
        }
    });

    router.get('/templates/invokedAttr', function (ctx, next) {
        console.log(ctx.query);
        let findAttrs = (templateModule: string, attrName: string) => {
            let m = registry.lookupModuleName(templateModule);
            let context = resolver.templateContext(m);
            let caller = registry.lookup(context) ? context : m;
            console.log("looking up parents for ", caller)
            return callGraph.invocations(caller, attrName);
        }
        
        let fullPath = path.resolve(ctx.query.path);

        let parents = findAttrs(fullPath, ctx.query.attr);
        if (ctx.query.format === "compact") {
            ctx.body = parents.join('\n');
        } else {
            ctx.body = JSON.stringify(parents);
        }
    });

    router.get('/templates/check', function (ctx, next) {
        console.log(ctx.query);
        let fullPath = path.resolve(ctx.query.path);
        let templateModule = registry.lookupModuleName(fullPath);
        let undefinedProps = check.undefinedProps(templateModule);
        if (ctx.query.format === "compact") {
            ctx.body = undefinedProps.join(',');
        } else {
            ctx.body = JSON.stringify(undefinedProps);
        }
    });
    router.get('/graph.svg', function (ctx, next) {
        console.log(ctx.query);
        let templateModule;
        if (ctx.query.path) {
            let fullPath = path.resolve(ctx.query.path);
            templateModule = registry.lookupModuleName(fullPath);
        } else if (ctx.query.module) {
            templateModule = ctx.query.module;
        } else {
            templateModule = null;
        }
        let collapse = ctx.query.collapse || false;
        let dot = callGraph.createDotGraph(templateModule, true, collapse);
        let svg = childProcess.execSync('dot -Tsvg', { input: dot });
        ctx.body = svg;
        ctx.type = "image/svg+xml"

    });
    router.get('/graph.dot', function (ctx, next) {
        console.log(ctx.query);
        let templateModule;
        if (ctx.query.path) {
            let fullPath = path.resolve(ctx.query.path);
            templateModule = registry.lookupModuleName(fullPath);
        } else if (ctx.query.module) {
            templateModule = ctx.query.module;
        } else {
            templateModule = null;
        }

        let dot = callGraph.createDotGraph(templateModule, true);
        ctx.body = dot;

    });

    router.get('/ast', function (ctx, next) {
        let fullPath = path.resolve(ctx.query.path);
        ctx.body = parser(fullPath);
    })

    app.use(router.routes())
        .use(router.allowedMethods());

    app.listen(5300);
    console.log("server listening on port 5300")
}
