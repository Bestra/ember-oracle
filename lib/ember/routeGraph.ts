import * as recast from 'recast'

interface RouteNode {
    parent: RouteNode;
    children: RouteNode[];
    moduleName: string;
    name: string;
}

export default function findRoutes(routerAst): RouteNode {
    recast.visit(routerAst, {
        visitCallExpression: function(path) {
          let node: ESTree.CallExpression = path.node;
          this.traverse(path);

        }
    })
    
    let appRoute = {
        parent: null,
        children: [],
        moduleName: 'application',
        name: 'application'
    }
    return appRoute;
}
