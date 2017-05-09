import Registry from './registry'
import Resolver from './resolver'
import { Graph, Edge } from 'graphlib'
import { Dict } from '../util/types'
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

export class NewRenderGraph {
    registry: Registry;
    graph = new Graph({multigraph: true});
    allInvocations: Dict<TemplateInvocation> = {};
    constructor(registry: Registry) {
      this.registry = registry;
    }
    init() {
         let templateCount = _.keys(this.registry.allModules('template')).length
        _.forEach(this.registry.allModules('template'), (val, key) => {
            this.createNode("template:" + key, null, {line: null, column: null} );
            process.stderr.write('.')
        });
        console.log("all done");
    }

    /**
     *  Creating a node for the rendering graph involves linking any given template to its parent
     *  by way of its rendering context.
     *  
     *  Both of those items might actually not exist - there are cases where a simple component might
     *  either be missing a template.hbs file (think of an Ember.Textfield subclass) or could be missing
     *  its component.js file.  Partials will have a template but no rendering context
     */
    createNode(templateModule: string, parentTemplateModule: string | null, invocation) {
        let contextModule = this.registry.templateContext(templateModule);
        let foundContext = this.registry.confirmExistance(contextModule);
        let foundTemplate = this.registry.confirmExistance(templateModule);

        // 3 cases
        // 1. parent i-> context -> template
        // 2. parent i-> context
        // 3. parent i-> template
        // TODO: note that partials will need to have their context set to the invoking template's context
        if (parentTemplateModule) {
          let {line, column} = invocation.invokedAt.position;
          let invocationTarget = (foundContext || foundTemplate);
          let edgeName = "invocation$" + parentTemplateModule + "$" + invocationTarget + "$" + line + ":" + column;
          if (this.allInvocations[edgeName]) { 
              return; 
            }
          this.graph.setEdge(parentTemplateModule, invocationTarget!, edgeName, edgeName);
          this.allInvocations[edgeName] = invocation;
        }

        let templateDef: Template | null = null;
        if (this.registry.lookup(templateModule)) {
            if (foundContext) {
                this.graph.setEdge(contextModule, templateModule, "context", "context");
            }
            templateDef = this.registry.lookup(templateModule).definition as Template;
            templateDef.invocations.forEach((i) => {
                   this.createNode(i.templateModule, templateModule, i);
            });
        }      
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