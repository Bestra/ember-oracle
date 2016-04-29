import * as registry from './registry'
import * as resolver from './resolver'

import * as _ from 'lodash'
import * as fs from 'fs'
import { Template, ComponentInvocation } from '../hbs'
import { EmberClass } from '../ember'
export let invocationsByTemplate = {};
export let invocationsByComponent = {};

export function init() {
    _.forEach(registry.allModules('template'), (val, key) => {
        let template = val.definition as Template;
        let invocations = template.components;
        invocationsByTemplate[template.moduleName] =
            {
                componentInvocations: invocations,
                context: template.renderingContext
            }
    });

    invocationsByComponent = _(invocationsByTemplate)
        .values()
        .map('componentInvocations')
        .flatten()
        .groupBy('moduleName')
        .value();
}

export function parentTemplates(componentModule: string) {
    let components = invocationsByComponent[componentModule] as ComponentInvocation[];
    return _(components)
        .map(c => c.invokedAt)
        .map(p => [p.filePath, p.position.line, p.position.column].join(':'))
        .value();
}

export interface InvocationNode {
    props;
    position;
    from: CallNode;
    to: CallNode;
}
export interface CallNode {
    template: { moduleName; props; actions } // called in the template
    context: { moduleName; props; actions }
}

export function graphVizNode(node: CallNode) {
    return `"${node.template.moduleName}" [label= "{ ${node.template.moduleName} | { ${_.keys(node.context.props).join('\\n')} | ${_.keys(node.template.props).join('\\n')} } }"];`
}

export function graphVizEdge(edge: InvocationNode) {
    if (_.get(edge, 'to.template.moduleName') && _.get(edge, 'from.template.moduleName')) {
        let label = `[ label ="${Object.keys(edge.props).join('\\n')}" ]`;
        return `"${edge.from.template.moduleName}" -> "${edge.to.template.moduleName}" ${label};`
    }
}
export let gNodes: { [index: string]: CallNode } = {};
export let gEdges: InvocationNode[] = [];
function createNode(templateModule: string) {
    if (gNodes[templateModule]) { return gNodes[templateModule]; }

    let contextModule = resolver.templateContext(templateModule);

    let template;
    let templateDef: Template;
    if (registry.lookup(templateModule)) {
        templateDef = registry.lookup(templateModule).definition as Template;
        template = {
            moduleName: templateModule,
            props: templateDef.props,
            actions: templateDef.actions
        }
    } else {
        template = {
            moduleName: null,
            props: {},
            actions: {}
        }
    }
    let context;
    if (registry.lookup(contextModule)) {
        let renderingContext = registry.lookup(contextModule).definition as EmberClass;
        context = {
            moduleName: contextModule,
            props: renderingContext.properties,
            actions: renderingContext.actions
        }
    } else {
        context = {
            moduleName: null,
            props: {},
            actions: {}
        }
    }
    let node = { template, context }
    gNodes[templateModule] = node;
    if (templateDef) {
        let invocations = templateDef.components;
        invocations.forEach((i) => {
            let edge = {
                from: node,
                to: createNode(i.templateModule),
                props: i.props,
                position: i.astNode.loc.start
            }
            gEdges.push(edge);
        });

    }
    return node;
}
export function createGraph() {
    let templateCount = _.keys(registry.allModules('template')).length
    _.forEach(registry.allModules('template'), (val, key) => {
        createNode("template:" + key);
        process.stderr.write('.')
    });
    return { gNodes, gEdges };
}

function outputGraph(nodes, edges) {
    let output = [
        "digraph {",
        "node [shape=record];",
        ...nodes.map(graphVizNode),
        ...edges.map(graphVizEdge),
        "}"
    ].join('\n');
    return output; 
}
export function createDotGraph(moduleName: string) {
    let findParentEdges = (node) => gEdges.filter(e => e.to === node);
    
    if (moduleName) {
        let node = gNodes[moduleName];
        let parentEdges = findParentEdges(node);
        let nodes = _.uniq(parentEdges.map(e => e.from)).concat(node);
        return outputGraph(nodes, parentEdges)
    } else {
        let graphNodes = _.values(gNodes);
        let graphEdges = gEdges;
        return outputGraph(graphNodes, graphEdges);      
    }
}