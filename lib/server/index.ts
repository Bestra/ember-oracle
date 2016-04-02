import * as Koa from 'koa'
import * as Router from "koa-router";

import defineComponents from '../components/'

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

    app.use(router.routes())
        .use(router.allowedMethods());

    app.listen(5300);
    console.log("server listening on port 5300")
}
