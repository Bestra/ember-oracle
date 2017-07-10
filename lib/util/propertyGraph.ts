import Registry from './registry';
import { Graph } from 'graphlib';
import {
  Dict,
  ModuleName,
  PropertyGraphNode,
  PropertyGraphNodeType
} from './types';
import { RenderGraph } from './renderGraph';
import {
  Template,
  PropertyInvocation,
  Path,
  BlockParam,
  ComponentInvocation
} from '../hbs/index';
import EmberClass, {
  PrototypeProperty,
  ImplicitPrototypeProperty,
  PropertySet
} from '../ember/emberClass';
import * as _ from 'lodash';

interface Edge { v: PropertyGraphNode; w: PropertyGraphNode }
export default class PropertyGraph {
  registry: Registry;
  renderGraph: RenderGraph;
  nodeIndex: { [P in PropertyGraphNodeType]: Dict<PropertyGraphNode[]> };
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

  lookupNode(s: string) {
    return this.allNodes[s];
  }

  init() {
    this.registry.allModules('template').forEach(t => {
      this.addTemplateBindings(t as Template);
      this.addPropertyInvocations(t as Template);
    });

    this.registry.allEmberModules().forEach(m => {
      this.addEmberProps(m);
    });

    this.registry.allEmberModules().forEach(m => {
      // wait to connect setters until all nodes have
      // been initialized
      this.connectPropertySets(m);
    });

    this.connectInvokedAttrs();
    this.connectBlockParams();
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

  connectPropertySets(e: EmberClass) {
    return e.propertySets.map(p => {
      return this.connectPropertySetToProto(p, e.moduleName, 'set');
    });
  }

  /**
   * Connect invocations to prototype properties, or create an implicit
   * prototype property
   */
  connectInvokedAttrs(): Edge[] {
    return this.getNodesOfType<PropertyInvocation>('propertyInvocation')
      .filter(p => {
        let target = p.invocation.moduleName;
        return !target.match('template:');
      })
      .map(p => {
        let target = p.invocation.moduleName;
        //if the target is an ember module, find or create the PrototypeProperty
        //on it.
        let props = this.getNodes<PrototypeProperty>(
          'prototypeProperty',
          target
        );
        let targetProp =
          _.find(props, a => {
            return a.name === p.name;
          }) || this.addNode(new ImplicitPrototypeProperty(p.name, target));
        this.graph.setEdge(
          p.propertyGraphKey,
          targetProp.propertyGraphKey,
          'invocation'
        );

        return { v: p, w: targetProp };
      });
    // connect the propertyInvocation to the corresponding name on the context,
    // or create a new implicitProperty node associated to the rendering context
  }

  /**
   * Not implemented
   */
  connectBlockParams() {
    return this.getNodesOfType<BlockParam>('blockParam').map(n => {
      let block = <{}>n.block as ComponentInvocation;
      if (block.templateModule) {
        let t = this.registry.lookup(block.templateModule) as Template;
        // TODO: this will need to work with partials
        // if (t) {
        //   t.getYield(n.index);
        // }
      }
    });
  }

  /**
   * Connects getters to a prototype property or an implicit prototype property
   * in the same module if it exists
   */
  connectGetsToSets() {
    return this.getNodesOfType<PropertyGraphNode>('propertyGet').map(n => {
      let context = n.nodeModuleName;
      this.connectGettertoSource(n, context);
      this.renderGraph.allParentClasses(context).forEach(a => {
        this.connectGettertoSource(n, a);
      });
    });
  }

  connectPropertySources(boundProperty: PropertyGraphNode) {
    //for a given bound property:
    //get the rendering context via the render graph

    let context = this.renderGraph.getRenderingContext(
      boundProperty.nodeModuleName
    );
    if (context) {
      let contextEdge = this.connectGettertoSource(boundProperty, context);
      let otherEdges = _(this.renderGraph.allParentClasses(context))
        .map(a => {
          return this.connectGettertoSource(boundProperty, a)!;
        })
        .compact()
        .value();

      return [contextEdge!].concat(otherEdges);
    }

    //go up the tree from the context and look for any other setters that match
  }

  /**
   * Connects a property get or a bound path to a prototype property in the given module if 
   * it exists
   * @param getter 
   * @param source 
   */
  connectGettertoSource(
    getter: PropertyGraphNode,
    source: ModuleName | undefined
  ) {
    let newEdge: Edge | undefined;
    if (source) {
      //connect a prototypeAssignment to the boundProperty if there is one
      let prototypeProps = this.nodeIndex.prototypeProperty[source];
      if (prototypeProps) {
        let protoProp = _.find(prototypeProps, p => {
          return p.name == getter.name;
        });
        if (protoProp) {
          this.graph.setEdge(
            protoProp.propertyGraphKey,
            getter.propertyGraphKey
          );
          newEdge = { v: protoProp, w: getter };
        }
      }
    }
    return newEdge;
  }

  /**
   * Connects all bound properties to prototype properties if they exist,
   * including implicit prototype properties created by invocations and setters
   */
  connectBindingsToContexts() {
    return this.getNodesOfType<Path>('boundProperty').map(boundProp => {
      return this.connectPropertySources(boundProp);
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
    this.graph.setNode(n.propertyGraphKey);
    this.allNodes[n.propertyGraphKey] = n;
    this.getNodes(n.nodeType, n.nodeModuleName).push(n);
    return n;
  }

  /**
 * 
 * Finds propertySets and prototypeProperty nodes for a given node.
 * Ignores implicitPrototypeProperty nodes.  This method does not create any 
 * new edges, it merely navigates existing ones
 */
  findPropertySources(n: PropertyGraphNode) {
    let preds = this.graph.predecessors(n.propertyGraphKey)!.map(p =>
      this.lookupNode(p)
    );
    //find predecessors. if a pred is an implicit prototype property find -its- predecessors
    return preds.reduce((acc, val) => {
      if (
        val.nodeType == 'prototypeProperty' &&
        (val as PrototypeProperty).isImplicit
      ) {
        // skip implicit prototype properties, grabbing their predecessors
        let implicitPreds = this.graph.predecessors(
          val.propertyGraphKey
        )!.map(p => this.lookupNode(p));
        return acc.concat(implicitPreds);
      } else {
        return acc.concat([val]);
      }
    }, [] as PropertyGraphNode[]);
  }

/**
 * For a PropertySet or a PrototypeProperty, finds PropertyGets and
 * BoundPropertys 
 * @param n 
 */
  findPropertySinks(n: PropertyGraphNode) {
    let children = this.graph.successors(n.propertyGraphKey)!.map(p =>
      this.lookupNode(p)
    );
    //find children. if a pred is an implicit prototype property find -its- children
    return children.reduce((acc, val) => {
      if (
        val.nodeType == 'prototypeProperty' &&
        (val as PrototypeProperty).isImplicit
      ) {
        // skip implicit prototype properties, grabbing their children
        let implicitNodes = this.graph.successors(
          val.propertyGraphKey
        )!.map(p => this.lookupNode(p));
        return acc.concat(implicitNodes);
      } else {
        return acc.concat([val]);
      }
    }, [] as PropertyGraphNode[]);
  }

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

  connectPropertySetToProto(
    p: PropertySet,
    target: ModuleName,
    edgeLabel: string
  ): Edge {
    let props = this.getNodes<PrototypeProperty>('prototypeProperty', target);
    let targetProp =
      _.find(props, a => {
        return a.name === p.name;
      }) || this.addNode(new ImplicitPrototypeProperty(p.name, target));
    this.graph.setEdge(
      p.propertyGraphKey,
      targetProp.propertyGraphKey,
      edgeLabel
    );
    return { v: p, w: targetProp };
  }

  addTemplateBindings(t: Template): (Edge | PropertyGraphNode)[] {
    //1. add nodes for all the props in the template
    //2. add nodes for block params
    //3. connect block params to their props
    return t.boundPaths.map(p => {
      let pNode = this.addNode(p);

      let b = t.blockParamFromPath(p);
      if (b) {
        let bNode = this.addNode(b);
        this.graph.setEdge(b.propertyGraphKey, p.propertyGraphKey);
        return { v: bNode, w: pNode };
      } else {
        return pNode;
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
        if (!v || !w) {
          throw `Missing a graph node v:${v.dotGraphKey}, w:${w.dotGraphKey}`;
        }
        return `"${v.dotGraphKey}" -> "${w.dotGraphKey}"`;
      }),
      '}'
    ].join('\n');
    console.log(output);
    return output;
  }
}
