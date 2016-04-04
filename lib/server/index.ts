import * as Koa from 'koa'
import * as Router from "koa-router";
import * as path from 'path';
import * as fs from 'fs';
import defineComponents from '../components/';
import findDefinition from '../hbs';

export default function start(appRoot: string) {
    let app = new Koa();
    let router = new Router();

    let components = defineComponents(appRoot);

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
        let src = fs.readFileSync(fullPath);
        ctx.body = JSON.stringify(
            findDefinition(
                { filePath: fullPath, source: src },
                ctx.query.name,
                ctx.query.line
            )
        );
    });

    app.use(router.routes())
        .use(router.allowedMethods());

    app.listen(5300);
    console.log("server listening on port 5300")
}
