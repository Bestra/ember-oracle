import Registry, { ModuleType } from './registry'
import Resolver from './resolver'
import { Graph, Edge } from 'graphlib'
import { Dict, ModuleName } from '../util/types'
import * as _ from 'lodash'
import * as fs from 'fs'
import { Template, TemplateInvocation } from '../hbs'
import { EmberClass } from '../ember'

export class NewRenderGraph {
    registry: Registry;
    graph = new Graph({ multigraph: true });
    allInvocations: Dict<TemplateInvocation> = {};
    constructor(registry: Registry) {
        this.registry = registry;
    }
    init() {
        console.log("adding all nodes");
       this.registry.allModules().forEach((key) => {
            this.addNode(key.definition.moduleName)
            process.stderr.write('.')

        })
        console.log("connecting rendering contexts");
        this.registry.allModules('template').forEach((key) => {
            this.connectRenderingContext(key.definition.moduleName);
            process.stderr.write('.')
        });
        console.log("connecting invocations");
        this.registry.allModules('template').forEach((key) => {
            this.connectInvocations(key.definition.moduleName);
        });
        console.log("all done");
        ['component',
            'controller',
            'router',
            'service',
            'route',
            'view',
            'model',
            'mixin'].forEach((t) => {
                this.registry.allModules(<ModuleType>t).forEach((key) => {
                  let module = key.definition as EmberClass;
                  this.connectSuperClass(module);
                  this.connectMixins(module);
                })
            })
    }

    // 1. Add nodes into the graph for everything in the registry
    // 2. Connect rendering contexts (js files) to templates
    // 3. For every invocation, connect the template to either the invoked js file or template
    // 4. Connect js files to superclasses and mixins
    addNode(moduleName: ModuleName) {
        this.graph.setNode(<string>moduleName);
    }

    connectRenderingContext(templateModuleName: ModuleName) {
        let c = this.registry.templateContext(templateModuleName);
        if (this.graph.node(c)) {
            this.graph.setEdge(c, templateModuleName, "context");
        }
    }
    connectInvocations(parentTemplateModuleName: ModuleName) {
        let template = this.registry.lookup(parentTemplateModuleName).definition as Template;
        let invocations = template.invocations;
        _.forEach(invocations, (i) => this.connectInvocation(parentTemplateModuleName, i));
        process.stderr.write(invocations.length.toString())
    }

    connectInvocation(parentTemplateModuleName: ModuleName, invocation: TemplateInvocation) {
        // 3 cases
        // 1. parent i-> context -> template
        // 2. parent i-> context
        // 3. parent i-> template
        // TODO: note that partials will need to have their context set to the invoking template's context
        let contextName = this.registry.templateContext(invocation.templateModule);
        let invocationTarget = (this.registry.confirmExistance(contextName) || invocation.templateModule);
        let { line, column } = invocation.invokedAt.position;
        let edgeName = "invocation$" + parentTemplateModuleName + "$" + invocationTarget + "$" + line + ":" + column;

        this.graph.setEdge(parentTemplateModuleName, invocationTarget, edgeName, edgeName);
        this.allInvocations[edgeName] = invocation;
    }

    connectSuperClass(module: EmberClass) {
      let s = module.superClass;
      if (s) {
          this.graph.setEdge(s.moduleName, module.moduleName, "subclass");
      }
    }

    connectMixins(module: EmberClass) {
        module.mixins.forEach((m) => {
            this.graph.setEdge(m.moduleName, module.moduleName, "mixin");
        })
    }

    // TODO: This method needs to go away and use the property graph instead
    invocations(componentModule: string, attrName: string) {
        return ["foo"];
    }

    /**
     * low-level fn used by invocationSites
     * @param nodeName 
     */
    invocationsForNode(nodeName: string): TemplateInvocation[] {
        let inEdges = this.graph.inEdges(nodeName)!;
        let invs = _.filter(inEdges, (e) => e.name!.match(/invocation/));
        return invs.map((i) => {
            return this.allInvocations[i.name!];
        })
    }

    /**
     *  template <-context- component <-inv- template
     *  template <-inv- template
     */
    invocationSites(templateModule: string): TemplateInvocation[] {
        // componentModule must be a 'template:*' for the time being.

        let inEdges = this.graph.inEdges(templateModule)!;
        let contextEdge = _.find(inEdges, (e) => e.name === "context");
        let edges: Edge[];
        if (contextEdge) {
            // if the template has a rendering context get the invocation edges
            // for that thing.
            return this.invocationsForNode(contextEdge.v);
        } else {
            // if no context, get the invocation edges for the template
            return this.invocationsForNode(templateModule);
        }
    }
    createDotGraph(moduleName: string, recurse?: boolean, collapseInvocations?: boolean) {
        let nodes = this.graph.nodes();
        let edges = this.graph.edges();
        let output = [
            "digraph {",
            "node [shape=record];",
            ...nodes.map(k => `"${k}"`),
            ...edges.map(k => `"${k.v}" -> "${k.w}"`),
            "}"
        ].join('\n');
        return output;
    }
}