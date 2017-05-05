import Registry from './registry'
import Resolver from './resolver'
import { Graph } from 'graphlib'

import * as _ from 'lodash'
import * as fs from 'fs'
import { Template, TemplateInvocation } from '../hbs'
import { EmberClass } from '../ember'
export class InvocationNode {
    props;
    position;
    count: number;
    from: CallNode;
    to: CallNode;
    isPartial: boolean;
}

export class CallNode {
    isPartial: boolean;
    invocations: InvocationNode[];
    template: { moduleName; props; actions } // called in the template
    context: { moduleName; props; actions }
}

export class RenderGraph {
    invocationsByTemplate: { [index: string]: { invocations: TemplateInvocation[]; context; template: string; } } = {};
    invocationsByComponent: { [index: string]: TemplateInvocation[] } = {};
    registry: Registry;
    resolver: Resolver;
    graph = new Graph();
    gNodes: { [index: string]: CallNode } = {};
    gEdges: InvocationNode[] = [];
    constructor(registry: Registry) {
      this.registry = registry;
      this.resolver = registry.resolver;
    }
    init() {
        _.forEach(this.registry.allModules('template'), (val, key) => {
            let template = val.definition as Template;
            let invocations = template.invocations;

            this.invocationsByTemplate[template.moduleName] =
                {
                    invocations: invocations,
                    template: template.moduleName,
                    context: template.renderingContext
                }
        });

        this.invocationsByComponent = _(this.invocationsByTemplate)
            .values()
            .map('invocations')
            .flatten()
            .groupBy('moduleName')
            .value() as any;
    }
    createNode(templateModule: string, isPartial: boolean) {
        if (this.gNodes[templateModule]) { return this.gNodes[templateModule]; }

        let contextModule = this.resolver.templateContext(templateModule);

        let template;
        let templateDef: Template | null = null;
        if (this.registry.lookup(templateModule)) {
            templateDef = this.registry.lookup(templateModule).definition as Template;
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
        if (this.registry.lookup(contextModule)) {
            let renderingContext = this.registry.lookup(contextModule).definition as EmberClass;
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
        this.gNodes[templateModule] = node;
        if (templateDef) {
            let invocations = templateDef.invocations;
            invocations.forEach((i) => {
                let edge = {
                    from: node,
                    to: this.createNode(i.templateModule, i.isPartial),
                    props: i.props,
                    count: 1,
                    isPartial: i.isPartial,
                    position: i.astNode.loc.start
                }
                node.invocations.push(edge);
                this.gEdges.push(edge);
            });

        }
        return node;
    }
    createGraph() {
        let templateCount = _.keys(this.registry.allModules('template')).length
        _.forEach(this.registry.allModules('template'), (val, key) => {
            this.createNode("template:" + key, false);
            process.stderr.write('.')
        });
        return { gNodes: this.gNodes, gEdges: this.gEdges };
    }

    invocations(componentModule: string, attrName: string) {
        return _.map(this.invocationsByComponent[componentModule], invocation => {
            let p = invocation.invokedAt;
            return [p.filePath, p.position.line, p.position.column, invocation.invokedAttr(attrName)].join(':')
        });
    }

    parentTemplates(componentModule: string) {
        let components = this.invocationsByComponent[componentModule];
        return _(components)
            .map(c => c.invokedAt)
            .map(p => [p.filePath, p.position.line, p.position.column].join(':'))
            .value();
    }

    createDotGraph(moduleName: string, recurse?: boolean, collapseInvocations?: boolean) {
        let findParentEdges = (moduleName: string, found) => {
            let edges = this.gEdges.filter(e => e.to.template.moduleName === moduleName);
            found.push(...edges);
            edges.forEach(e => {
                if (e.from.template.moduleName) { findParentEdges(e.from.template.moduleName, found) }
            });
            return found;
        };

        if (moduleName) {
            let node = this.gNodes[moduleName];
            let parentEdges = findParentEdges(moduleName, []);
            let nodes = _.uniq<CallNode>(parentEdges.map(e => e.from).concat(parentEdges.map(e => e.to)));
            return this.outputGraph(nodes, parentEdges, collapseInvocations)
        } else {
            let graphNodes = _.values<CallNode>(this.gNodes);
            let graphEdges = this.gEdges;
            return this.outputGraph(graphNodes, graphEdges, collapseInvocations);
        }
    }

    outputGraph(nodes: CallNode[], edges: InvocationNode[], collapse) {
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

function condenseEdges(node: CallNode) {
    let condensed = [];
    let a = _(node.invocations)
        .groupBy(i => i.to.template.moduleName)
        .map(function (invocations: InvocationNode[], toModule) {
            let groupedInvocations = _.groupBy(invocations, i => Object.keys(i.props).sort().join(','));
            return _.map(groupedInvocations, (grp, propList): InvocationNode => {
                let { props, isPartial, from, to, position } = grp[0];
                return { props, isPartial, from, to, position, count: grp.length }
            });
        })
        .flatten<InvocationNode>()
        .value();

    return a;
}