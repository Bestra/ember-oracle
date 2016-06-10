import * as recast from 'recast'
import * as _ from 'lodash'

interface RouteNode {
    parent: RouteNode;
    children: RouteNode[];
    moduleName: string;
    name: string;
}

function findChildRoutes(routeFnNode: ESTree.FunctionExpression, parentRoute) {
    let routeNodes = [];
    let isRoute = _.matches(
        {
            callee: {
                object: { type: "ThisExpression" },
                property: { name: "route" }
            }
        }
    )
    recast.visit(routeFnNode, {
        visitCallExpression(path) {
            if (isRoute(path.node) && path.node !== parentRoute.node) {
                routeNodes.push(path.node)
                return false;
            } else {
                this.traverse(path)
            }
        }
    });

    return routeNodes.map((routeCallNode) => {
        let child = {
            node: routeCallNode,
            parent: parentRoute,
            children: [],
            moduleName: routeCallNode.arguments[0].value,
            name: routeCallNode.arguments[0].value
        }
        child.children = findChildRoutes(routeCallNode, child)
        console.log("found a child of ", parentRoute.moduleName, "- ", child.moduleName);
        
        return child;
    })
}

export default function findRoutes(routerAst): RouteNode {
    let routeFn;
    let isRouteMap = _.matches(
        {
            callee: {
                object: { name: "Router" },
                property: { name: "map" }
            }
        }
    )

    recast.visit(routerAst, {
        visitCallExpression(path) {
            let node = path.node;
            if (isRouteMap(node)) {
                routeFn = node;
            }
            return false
        }
    });

    let appRoute = {
        node: routeFn,
        parent: null,
        children: null,
        moduleName: 'application',
        name: 'application'
    }

    appRoute.children = findChildRoutes(routeFn, appRoute);

    return appRoute;
}
