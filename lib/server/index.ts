import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as path from 'path';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import Resolver from '../util/resolver';
import Registry from '../util/registry';
import * as _ from 'lodash';

import { ok } from 'assert';

import Application from './app';

export default class Server {
  app: Application;
  start(appPath: string, enginePaths: string[]) {
    let koaApp = new Koa();
    let router = new Router();

    let t1 = Date.now();
    let resolver = new Resolver();
    let registry = new Registry(resolver);
    let app = new Application(resolver, registry);
    app.init(appPath, enginePaths);

    router.get('/', function(ctx, next) {
      console.log(ctx);
      ctx.body = ctx.query;
    });

    router.get('/files/alternate', function(ctx, next) {
      let associated = app.alternateFile(ctx.query.path);

      if (associated) {
        ctx.body = associated;
      } else {
        ctx.body = 'No alternate found';
      }
    });

    router.get('/modules', function(ctx, next) {
      let type = ctx.query.type;
      ctx.body = app.moduleNames(type).join('\n');
    });

    router.get('/module', function(ctx, next) {
      let moduleName = ctx.query.moduleName;
      console.log('looking up filepath for module ', moduleName);
      ctx.body = app.modulePath(moduleName);
    });

    router.get('/templates/definition', function(ctx, next) {
      console.log('finding definition for symbol in template at: ', ctx.query);
      let { path, line, column, attr, format } = ctx.query;
      let { position, invokedAttrs } = app.definitionForSymbolInTemplate(
        path,
        line,
        column,
        attr
      );

      console.log('found position: ', JSON.stringify(position));
      if (format === 'compact') {
        if (position) {
          let definitionFile = fs.readFileSync(position.filePath, 'utf8');
          let defLine;
          if (position.position.line > 0) {
            let lines = definitionFile.split('\n');
            defLine = lines[position.position.line - 1].replace(':', ':');
          } else {
            defLine = '';
          }
          let definitionPosition = [
            position.filePath,
            position.position.line,
            position.position.column,
            defLine
          ].join(':');
          ctx.body = [definitionPosition, ...invokedAttrs].join('\n');
        } else {
          ctx.body = invokedAttrs.join('\n');
        }
      } else {
        ctx.body = JSON.stringify(position);
      }
    });

    router.get('/templates/parents', function(ctx, next) {
      console.log(ctx.query);
      // TODO: change callgraph to work off templates first rather than context
      let fullPath = path.resolve(ctx.query.path);

      let parents = app.findParents(fullPath).map(t => {
        let { line, column } = t.invokedAt.position;
        return [t.invokedAt.filePath, line, column].join(':');
      });

      if (ctx.query.format === 'compact') {
        ctx.body = parents.join('\n');
      } else {
        ctx.body = JSON.stringify(parents);
      }
    });

    router.get('/templates/invokedAttr', function(ctx, next) {
      console.log(ctx.query);

      let fullPath = path.resolve(ctx.query.path);
      let parents = app.invokedAttrs(fullPath, ctx.query.attr);
      if (ctx.query.format === 'compact') {
        ctx.body = parents.join('\n');
      } else {
        ctx.body = JSON.stringify(parents);
      }
    });

    router.get('/renderGraph.dot', function(ctx, next) {
      console.log(ctx.query);
      let dot = app.renderDotGraph(ctx.query);
      ctx.body = dot;
    });
    router.get('/renderGraph.svg', function(ctx, next) {
      console.log(ctx.query);
      let svg = app.renderSvgGraph(ctx.query);

      ctx.body = svg;
      ctx.type = 'image/svg+xml';
    });

    router.get('/propertyGraph.svg', function(ctx, next) {
      console.log(ctx.query);
      let svg = app.propertySvgGraph(ctx.query);

      ctx.body = svg;
      ctx.type = 'image/svg+xml';
    });

    koaApp.use(router.routes()).use(router.allowedMethods());

    koaApp.listen(5300);
    console.log('server listening on port 5300');
  }
}
