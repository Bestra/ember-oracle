import Registry from "./registry";
import { Graph } from "graphlib";
import { Dict, ModuleName, PropertyGraphNode, PropertyGraphNodeType } from "./types";
import { RenderGraph } from "./renderGraph";
import { Template, PropertyInvocation, Path } from "../hbs/index";
import EmberClass, { PrototypeProperty, ImplicitPrototypeProperty } from "../ember/emberClass";
import * as _ from "lodash";

export default class PropertyGraph {
    registry: Registry;
    renderGraph: RenderGraph;
    nodeIndex: {
        [P in PropertyGraphNodeType]: Dict<PropertyGraphNode[]>;
    };
    nodeId = 0;
    allNodes = {};

    graph = new Graph({ multigraph: false });
    constructor(registry: Registry, renderGraph: RenderGraph) {
        this.registry = registry;
        this.renderGraph = renderGraph;
        this.allNodes = {};
        this.nodeIndex = {
          boundProperty: {},
          propertyGet: {},
          propertySet: {},
          propertyInvocation: {},
          prototypeProperty: {},
          blockParam: {}
        }
    }

    init() {
        this.registry.allModules('template').forEach((t) => {
            this.addTemplateBindings(t.definition as Template);
            this.addPropertyInvocations(t.definition as Template)    
        });

        this.registry.allEmberModules().forEach((m) => {
            this.addEmberProps(m);            
        })
        
        this.connectInvokedAttrs();
        this.connectYields();
        this.connectGetsToSets();
        this.connectBindingsToContexts();
    }
    
    addPropertyInvocations(template: Template) {
     // for each invocation
      template.invocations.forEach((i) => {
          let { line, column } = i.invokedAt.position;
          _.forEach(i.props, (v, k) => {
            this.addNode(new PropertyInvocation(i, k!, v))      
          });
      })
    }

    connectInvokedAttrs() {
        this.getNodesOfType<PropertyInvocation>("propertyInvocation").forEach((p) => {
            let target = p.invocation.moduleName;
            //if the target is a template, do nothing for now.
            if (target.match("template:")) { return; }

            //if the target is an ember module, find or create the PrototypeProperty
            //on it.  
            let props = this.getNodes<PrototypeProperty>("prototypeProperty", target);
            let targetProp = _.find(props, (a) => {
                a.name === p.key;
            }) || this.addNode(new ImplicitPrototypeProperty(p.key, target))
            this.graph.setEdge(p.propertyGraphKey, targetProp.propertyGraphKey, "invocation"); 
        });
        // connect the propertyInvocation to the corresponding name on the context,
        // or create a new implicitProperty node associated to the rendering context
    }
    
    connectYields() {

    }

    connectGetsToSets() {
   
    }

    connectPropertySources(boundProperty) {
        //go to the rendering context
        //connect a prototypeAssignment to the boundProperty if there is one
        //connect any setters of that property to the prototypeAssignment
        //go up the tree from the context and look for any other setters that match
    }

    connectBindingsToContexts() {
        this.getNodesOfType<Path>("boundProperty").forEach((boundProp) => {
            this.connectPropertySources(boundProp);
        });
    }
    
    getNodesOfType<T>(nodeType: PropertyGraphNodeType): T[] {
        return _(this.nodeIndex[nodeType]).values().flatten().value() as T[];
    }

    getNodes<T>(nodeType, moduleName: ModuleName): T[] {
        let existingArray = this.nodeIndex[nodeType][moduleName];
        if (existingArray === undefined) {
            let newArray = this.nodeIndex[nodeType][moduleName] = [];
            return newArray
        } else {
            return existingArray
        }
    }
    addNode(n: PropertyGraphNode) {
        n.nodeId = this.nodeId;
        this.graph.setNode(n.propertyGraphKey);
        this.allNodes[n.propertyGraphKey] = n;
        this.getNodes(n.nodeType, n.nodeModuleName).push(n);
        this.nodeId = this.nodeId + 1;
        return n;
    }

    findNode(nodeType: PropertyGraphNodeType, fn) {

    }

    addEmberProps(e: EmberClass) {
      e.props.forEach((p) => {
          this.addNode(p);
      })
      e.propertyGets.forEach((p) => {
          this.addNode(p);
      })
      e.propertySets.forEach((p) => {
          this.addNode(p);
      })
    }

    addTemplateBindings(t: Template) {
        //1. add nodes for all the props in the template
        //2. add nodes for block params
        //3. connect block params to their props
        t.boundPaths.forEach((p) => {
            let pKey = this.addNode(p);

            let b = t.blockParamFromPath(p);
            if (b) {
              this.addNode(b);
              this.graph.setEdge(b.propertyGraphKey, p.propertyGraphKey)
            }
        });
    }

    createDotGraph() {
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