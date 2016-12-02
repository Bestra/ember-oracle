import * as registry from './registry'
import * as resolver from './resolver'

import * as _ from 'lodash'
import * as fs from 'fs'
import { Template, TemplateInvocation } from '../hbs'
import { EmberClass } from '../ember'
export let invocationsByTemplate: { [index: string]: { invocations: TemplateInvocation[]; context; template: string; } } = {};
export let invocationsByComponent: { [index: string]: TemplateInvocation[] } = {};

export function init() {
    _.forEach(registry.allModules('template'), (val, key) => {
        let template = val.definition as Template;
        let invocations = template.invocations;

        invocationsByTemplate[template.moduleName] =
            {
                invocations: invocations,
                template: template.moduleName,
                context: template.renderingContext
            }
    });

    invocationsByComponent = _(invocationsByTemplate)
        .values()
        .map('invocations')
        .flatten()
        .groupBy('moduleName')
        .value() as any;
}

export function invocations(componentModule: string, attrName: string) {
    return _.map(invocationsByComponent[componentModule], invocation => {
        let p = invocation.invokedAt;
        return [p.filePath, p.position.line, p.position.column, invocation.invokedAttr(attrName)].join(':')
    });
}

export function parentTemplates(componentModule: string) {
    let components = invocationsByComponent[componentModule];
    return _(components)
        .map(c => c.invokedAt)
        .map(p => [p.filePath, p.position.line, p.position.column].join(':'))
        .value();
}

export interface InvocationNode {
    props;
    position;
    count: number;
    from: CallNode;
    to: CallNode;
    isPartial: boolean;
}

export interface CallNode {
    isPartial: boolean;
    invocations: InvocationNode[];
    template: { moduleName; props; actions } // called in the template
    context: { moduleName; props; actions }
}

export function graphVizNode(node: CallNode) {
    let url = `URL="http://localhost:5300/graph.svg?module=${node.template.moduleName}"`
    let style = node.isPartial ? `style="dashed" color="green"` : '';

    return `"${node.template.moduleName}" [${url} ${style} label= "{ ${node.template.moduleName} | { ${_.keys(node.context.props).join('\\n')} | ${_.keys(node.template.props).join('\\n')} } }"];`
}

export function graphVizEdge(edge: InvocationNode) {
    if (_.get(edge, 'to.template.moduleName') && _.get(edge, 'from.template.moduleName')) {
        let labelText = [edge.count, ...Object.keys(edge.props)].join('\\n');

        let style = edge.isPartial ? `style="dashed" color="green"` : '';
        let label = `[ ${style} label ="${labelText}" ]`;
        return `"${edge.from.template.moduleName}" -> "${edge.to.template.moduleName}" ${label};`
    }
}
export let gNodes: { [index: string]: CallNode } = {};
export let gEdges: InvocationNode[] = [];
function createNode(templateModule: string, isPartial: boolean) {
    if (gNodes[templateModule]) { return gNodes[templateModule]; }

    let contextModule = resolver.templateContext(templateModule);

    let template;
    let templateDef: Template | null = null;
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
    let node: CallNode = {
        template,
        context, isPartial,
        invocations: []
    }
    gNodes[templateModule] = node;
    if (templateDef) {
        let invocations = templateDef.invocations;
        invocations.forEach((i) => {
            let edge = {
                from: node,
                to: createNode(i.templateModule, i.isPartial),
                props: i.props,
                count: 1,
                isPartial: i.isPartial,
                position: i.astNode.loc.start
            }
            node.invocations.push(edge);
            gEdges.push(edge);
        });

    }
    return node;
}
export function createGraph() {
    let templateCount = _.keys(registry.allModules('template')).length
    _.forEach(registry.allModules('template'), (val, key) => {
        createNode("template:" + key, false);
        process.stderr.write('.')
    });
    return { gNodes, gEdges };
}

function condenseEdges(node: CallNode) {
    let condensed = [];
    let a = _(node.invocations)
        .groupBy(i => i.to.template.moduleName)
        .map(function (invocations: InvocationNode[], toModule) {
            let groupedInvocations = _.groupBy(invocations, i => Object.keys(i.props).sort().join(','));
            return _.map(groupedInvocations, (grp, propList): InvocationNode => {
                let {props, isPartial, from, to, position} = grp[0];
                return { props, isPartial, from, to, position, count: grp.length }
            });
        })
        .flatten<InvocationNode>()
        .value();

    return a;
}
function outputGraph(nodes: CallNode[], edges: InvocationNode[], collapse) {
    let outputEdges;
    if (collapse) {
        let edgesPerNode = _.groupBy(edges, 'from');
        outputEdges = _.flatMap(nodes, condenseEdges)
    } else {
        outputEdges = edges;
    }
    let output = [
        "digraph {",
        "node [shape=record];",
        ...nodes.map(graphVizNode),
        ...outputEdges.map(graphVizEdge),
        "}"
    ].join('\n');
    return output;
}

export function createDotGraph(moduleName: string, recurse?: boolean, collapseInvocations?: boolean) {
    let findParentEdges = (moduleName: string, found) => {
        let edges = gEdges.filter(e => e.to.template.moduleName === moduleName);
        found.push(...edges);
        edges.forEach(e => {
            if (e.from.template.moduleName) { findParentEdges(e.from.template.moduleName, found) }
        });
        return found;
    };

    if (moduleName) {
        let node = gNodes[moduleName];
        let parentEdges = findParentEdges(moduleName, []);
        let nodes = _.uniq<CallNode>(parentEdges.map(e => e.from).concat(parentEdges.map(e => e.to)));
        return outputGraph(nodes, parentEdges, collapseInvocations)
    } else {
        let graphNodes = _.values<CallNode>(gNodes);
        let graphEdges = gEdges;
        return outputGraph(graphNodes, graphEdges, collapseInvocations);
    }
}