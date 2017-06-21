import Registry from './registry';
import { Graph } from 'graphlib';
import {
  Dict,
  ModuleName,
  PropertyGraphNode,
  PropertyGraphNodeType
} from './types';
import { RenderGraph } from './renderGraph';
import { Template, PropertyInvocation, Path } from '../hbs/index';
import EmberClass, {
  PrototypeProperty,
  ImplicitPrototypeProperty
} from '../ember/emberClass';
import * as _ from 'lodash';

export default class PropertyGraph {
  registry: Registry;
  renderGraph: RenderGraph;
  nodeIndex: { [P in PropertyGraphNodeType]: Dict<PropertyGraphNode[]> };
  nodeId = 0;
  /**
   * every node in the property graph, regardless of type
   */
  allNodes: Dict<PropertyGraphNode> = {};

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
    };
  }

  init() {
    this.registry.allModules('template').forEach(t => {
      this.addTemplateBindings(t.definition as Template);
      this.addPropertyInvocations(t.definition as Template);
    });

    this.registry.allEmberModules().forEach(m => {
      this.addEmberProps(m);
    });

    this.connectInvokedAttrs();
    this.connectYields();
    this.connectGetsToSets();
    this.connectBindingsToContexts();
  }

  addPropertyInvocations(template: Template) {
    // for each invocation
    return template.invocations.map(i => {
      let { line, column } = i.invokedAt.position;
      return _.map(i.props, (v, k) => {
        return this.addNode(new PropertyInvocation(i, k!, v));
      });
    });
  }

  /**
   * Connect invocations to prototype properties, or create an implicit
   * prototype property
   */
  connectInvokedAttrs() {
    return this.getNodesOfType<PropertyInvocation>(
      'propertyInvocation'
    ).map(p => {
      let target = p.invocation.moduleName;
      //if the target is a template, do nothing for now.
      if (target.match('template:')) {
        return [];
      }

      //if the target is an ember module, find or create the PrototypeProperty
      //on it.
      let props = this.getNodes<PrototypeProperty>('prototypeProperty', target);
      let targetProp =
        _.find(props, a => {
          return a.name === p.key;
        }) || this.addNode(new ImplicitPrototypeProperty(p.key, target));
      this.graph.setEdge(
        p.propertyGraphKey,
        targetProp.propertyGraphKey,
        'invocation'
      );

      return [p, targetProp];
    });
    // connect the propertyInvocation to the corresponding name on the context,
    // or create a new implicitProperty node associated to the rendering context
  }

  /**
   * Not implemented
   */
  connectYields() {}
  /**
   * Not implemented
   */
  connectGetsToSets() {}

  connectPropertySources(boundProperty) {
    //go to the rendering context
    //connect a prototypeAssignment to the boundProperty if there is one
    //connect any setters of that property to the prototypeAssignment
    //go up the tree from the context and look for any other setters that match
  }

  connectBindingsToContexts() {
    this.getNodesOfType<Path>('boundProperty').forEach(boundProp => {
      this.connectPropertySources(boundProp);
    });
  }

  /**
   * Returns all modes of a given type
   */
  getNodesOfType<T>(nodeType: PropertyGraphNodeType): T[] {
    return _(this.nodeIndex[nodeType]).values().flatten().value() as T[];
  }

  /**
   * 
   * Returns all nodes of a given type and module name
   */
  getNodes<T>(nodeType, moduleName: ModuleName): T[] {
    let existingArray = this.nodeIndex[nodeType][moduleName];
    if (existingArray === undefined) {
      let newArray = (this.nodeIndex[nodeType][moduleName] = []);
      return newArray;
    } else {
      return existingArray;
    }
  }

  /**
   * 
   * Adds a PropertyGraph node both the underlying graph structure
   * and to the node indices
   */
  addNode(n: PropertyGraphNode) {
    n.nodeId = this.nodeId;
    this.graph.setNode(n.propertyGraphKey);
    this.allNodes[n.propertyGraphKey] = n;
    this.getNodes(n.nodeType, n.nodeModuleName).push(n);
    this.nodeId = this.nodeId + 1;
    return n;
  }

  findNode(nodeType: PropertyGraphNodeType, fn) {}

  addEmberProps(e: EmberClass) {
    return {
      prototypeProps: e.props.map(p => {
        return this.addNode(p);
      }),
      propertyGets: e.propertyGets.map(p => {
        return this.addNode(p);
      }),
      propertySets: e.propertySets.map(p => {
        return this.addNode(p);
      })
    };
  }

  addTemplateBindings(t: Template) {
    //1. add nodes for all the props in the template
    //2. add nodes for block params
    //3. connect block params to their props
    return t.boundPaths.map(p => {
      let pNode = this.addNode(p);

      let b = t.blockParamFromPath(p);
      if (b) {
        let bNode = this.addNode(b);
        this.graph.setEdge(b.propertyGraphKey, p.propertyGraphKey);
        return [bNode, pNode];
      } else {
        return [pNode];
      }
    });
  }

  createDotGraph() {
    let nodesByModule = _(this.allNodes)
      .values<PropertyGraphNode>()
      .groupBy(n => {
        return n.nodeModuleName;
      })
      .value();
    let edges = this.graph.edges();
    let subgraphs = _.map(nodesByModule, (v, k) => {
      return [
        `subgraph cluster_${k!.replace(/(-|:|\/)/g, '_')} {`,
        `label = "${k}"`,
        ...v.map(node => `"${node.dotGraphKey}"`),
        '}'
      ].join('\n');
    });
    let output = [
      'digraph {',
      'node [shape=record];',
      ...subgraphs,

      ...edges.map(k => {
        let v = this.allNodes[k.v];
        let w = this.allNodes[k.w];
        return `"${v.dotGraphKey}" -> "${w.dotGraphKey}"`;
      }),
      '}'
    ].join('\n');
    console.log(output);
    return output;
  }
}
