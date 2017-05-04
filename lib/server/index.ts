import * as Koa from 'koa'
import * as Router from "koa-router";
import * as path from 'path';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import Resolver from '../util/resolver'
import Registry from '../util/registry'
import { CallGraph } from '../util/callGraph'
import parser from '../util/parser';
import * as _ from 'lodash'

import { Template } from '../hbs';

import { ok } from 'assert'

import Application from './startApp'

export default class Server {
    app: Application;
    start(appPath: string, enginePaths: string[]) {
       
        let koaApp = new Koa();
        let router = new Router();

        let t1 = Date.now();
        let resolver = new Resolver();
        let registry = new Registry(resolver);
        let app = new Application(resolver, registry)
        app.init(appPath, enginePaths);
        this.app = app;
        let callGraph = new CallGraph(resolver, registry);

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
            let moduleName = app.registry.lookupModuleName(fullPath);
            console.log("looking up alternate for module ", moduleName)

            let associated = app.resolver.alternateModule(moduleName);
            if (associated) {
                ctx.body = app.registry.lookup(associated).filePath;
            } else {
                ctx.body = "No alternate found"
            }
        });

        router.get('/modules', function (ctx, next) {
            let type = ctx.query.type;
            ctx.body = app.registry.moduleNames(type).join('\n');
        });

        router.get('/module', function (ctx, next) {
            let moduleName = ctx.query.moduleName;
            console.log("looking up filepath for module ", moduleName);
            ctx.body = app.registry.lookup(moduleName).definition.filePath;
        });

        router.get('/templates/definition', function (ctx, next) {
            console.log(ctx.query);
            let fullPath = path.resolve(ctx.query.path);
            let template = app.registry.lookup(app.registry.lookupModuleName(fullPath)).definition as Template;

            let queryPosition = { line: parseInt(ctx.query.line), column: parseInt(ctx.query.column) };
            let defineable = template.parsePosition(queryPosition);
            let position = defineable.definedAt;
            let invokedAttrs = callGraph.invocations(
                app.resolver.templateContext(template.moduleName),
                ctx.query.attr
            ).filter((a) => { return !a.match(/not provided/) });

            console.log("found position: ", JSON.stringify(position))
            if (ctx.query.format === "compact") {
                if (position) {
                    let definitionFile = fs.readFileSync(position.filePath, 'utf8');
                    let defLine;
                    if (position.position.line > 0) {
                        let lines = definitionFile.split('\n');
                        defLine = lines[position.position.line - 1].replace(':', '\:');
                    } else {
                        defLine = "";
                    }
                    let definitionPosition = [position.filePath, position.position.line, position.position.column, defLine].join(':');
                    ctx.body = [definitionPosition, ...invokedAttrs].join('\n');
                } else {
                    ctx.body = invokedAttrs.join('\n');
                }
            } else {
                ctx.body = JSON.stringify(position);
            }
        });

        let findContextModule = (filePath: string) => {
            let m = app.registry.lookupModuleName(filePath);
            let contextModule = app.resolver.templateContext(m);
            return app.registry.lookup(contextModule) ? contextModule : m;
        }

        let findAttrs = (templateFilePath: string, attrName: string) => {
            let m = findContextModule(templateFilePath);
            console.log("looking up parents for ", m)
            return callGraph.invocations(m, attrName);
        }

        let findParents = (templateFilePath: string) => {
            let m = findContextModule(templateFilePath);
            console.log("looking up attrs for ", m)
            return callGraph.parentTemplates(m);
        }

        router.get('/templates/parents', function (ctx, next) {
            console.log(ctx.query);
            // TODO: change callgraph to work off templates first rather than context
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

            let fullPath = path.resolve(ctx.query.path);
            let parents = findAttrs(fullPath, ctx.query.attr);
            if (ctx.query.format === "compact") {
                ctx.body = parents.join('\n');
            } else {
                ctx.body = JSON.stringify(parents);
            }
        });

        router.get('/graph.svg', function (ctx, next) {
            console.log(ctx.query);
            let templateModule;
            if (ctx.query.path) {
                let fullPath = path.resolve(ctx.query.path);
                templateModule = app.registry.lookupModuleName(fullPath);
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
                templateModule = app.registry.lookupModuleName(fullPath);
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

        koaApp.use(router.routes())
            .use(router.allowedMethods());

        koaApp.listen(5300);
        console.log("server listening on port 5300")
    }
}