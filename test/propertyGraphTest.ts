let td = require('testdouble');
import * as _ from 'lodash';
import * as assert from 'assert';
import Registry from '../lib/util/registry';
import Resolver from '../lib/util/resolver';
import EmberClass, {
  PrototypeProperty,
  PropertyGet,
  PropertySet
} from '../lib/ember/emberClass';
import { ModuleName, FilePath } from '../lib/util/types';
import PropertyGraph from '../lib/util/propertyGraph';
import { RenderGraph } from '../lib/util/renderGraph';
import { Path } from '../lib/hbs/index';
afterEach(function() {
  td.reset();
});

describe('PropertyGraph', function() {
  describe('addTemplateBindings', function() {
    describe('boundPaths', function() {
      it('adds a node to the graph', function() {
        let registry = new Registry(new Resolver());
        let renderGraph = new RenderGraph(registry);
        let subject = new PropertyGraph(registry, renderGraph);
        let newModule = registry.registerModule(
          <FilePath>'foo',
          <ModuleName>'template:foo',
          `{{foo.bar}}`
        );
        subject.addTemplateBindings(newModule);
        assert.equal(_.keys(subject.allNodes).length, 1);
        assert.ok(subject.nodeIndex.boundProperty['template:foo']);
      });
      describe('with a block param', function() {
        it('adds the block param node to the graph', function() {
          let registry = new Registry(new Resolver());
          let renderGraph = new RenderGraph(registry);
          let subject = new PropertyGraph(registry, renderGraph);
          let newModule = registry.registerModule(
            <FilePath>'foo',
            <ModuleName>'template:foo',
            `{{#each foos as |foo|}}
          {{foo.bar}}
          {{/each}}`
          );
          subject.addTemplateBindings(newModule);
          assert.equal(
            _.keys(subject.allNodes).length,
            3,
            'it adds a block param node and a bound property node'
          );
          assert.equal(
            subject.nodeIndex.boundProperty['template:foo'].length,
            2,
            'adds a node for each property'
          );
          assert.equal(
            subject.nodeIndex.blockParam['template:foo'].length,
            1,
            'adds a node for the block param itself'
          );

          let boundVal = _.find(
            subject.nodeIndex.boundProperty['template:foo'],
            i => {
              return i.dotGraphKey.match(/\$foo\$/);
            }
          );
          let blockParam = subject.nodeIndex.blockParam['template:foo'][0];
          assert.ok(
            subject.graph.hasEdge(
              blockParam.propertyGraphKey,
              boundVal!.propertyGraphKey
            ),
            'adds an edge between the bound path node and the block param node'
          );
        });
      });
    });
  });
  describe('addPropertyInvocations', function() {
    it('adds a node for each invoked attribute', function() {
      let registry = new Registry(new Resolver());
      let renderGraph = new RenderGraph(registry);
      let subject = new PropertyGraph(registry, renderGraph);
      let parentTemplate = registry.registerModule(
        <FilePath>'foo',
        <ModuleName>'template:foo',
        `{{my-component bar="baz" dude="sweet"}}`
      );
      let childComponent = registry.registerModule(
        <FilePath>'my-component',
        <ModuleName>'component:my-component',
        `export default Ember.Component.extend({
            bar: null
          });`
      );

      subject.addPropertyInvocations(parentTemplate);

      assert.equal(
        subject.nodeIndex.propertyInvocation['template:foo'].length,
        2,
        'adds a node for the block param itself'
      );
    });
  });

  describe('addEmberProps', function() {
    describe('property gets', function() {
      it('adds a node to the graph', function() {
        let registry = new Registry(new Resolver());
        let renderGraph = new RenderGraph(registry);
        let subject = new PropertyGraph(registry, renderGraph);
        let component = registry.registerModule(
          <FilePath>'my-component',
          <ModuleName>'component:my-component',
          `export default Ember.Component.extend({
            bar: Ember.computed(function() {
              this.get('foo');
            })
          });`
        );

        subject.addEmberProps(component);
        let result = subject.nodeIndex.propertyGet[
          'component:my-component'
        ][0] as PropertyGet;
        assert.equal(result.name, 'foo');
      });
      xit('works with "getProperties" calls');
    });
    describe('property sets', function() {
      it('adds a node to the graph', function() {
        let registry = new Registry(new Resolver());
        let renderGraph = new RenderGraph(registry);
        let subject = new PropertyGraph(registry, renderGraph);
        let component = registry.registerModule(
          <FilePath>'my-component',
          <ModuleName>'component:my-component',
          `export default Ember.Component.extend({
            bar: Ember.computed(function() {
              this.set('foo');
            })
          });`
        );

        subject.addEmberProps(component);
        let result = subject.nodeIndex.propertySet[
          'component:my-component'
        ][0] as PropertySet;
        assert.equal(result.name, 'foo');
      });

      xit('works with "setProperties" calls');
    });
    describe('prototype assignments', function() {
      it('adds a node to the graph', function() {
        let registry = new Registry(new Resolver());
        let renderGraph = new RenderGraph(registry);
        let subject = new PropertyGraph(registry, renderGraph);
        let component = registry.registerModule(
          <FilePath>'my-component',
          <ModuleName>'component:my-component',
          `export default Ember.Component.extend({
            bar: Ember.computed(function() {
              this.get('foo');
            })
          });`
        );

        subject.addEmberProps(component);
        let result = subject.nodeIndex.prototypeProperty[
          'component:my-component'
        ][0] as PrototypeProperty;
        assert.equal(result.name, 'bar');
      });
    });
  });
  describe('connectInvokedAttrs', function() {
    it(
      'connects a property invocation to a prototype property',
      function() {
        let registry = new Registry(new Resolver());
        let renderGraph = new RenderGraph(registry);
        let subject = new PropertyGraph(registry, renderGraph);
        let parentTemplate = registry.registerModule(
          <FilePath>'foo',
          <ModuleName>'template:foo',
          `{{my-component bar="baz"}}`
        );
        let childComponent = registry.registerModule(
          <FilePath>'my-component',
          <ModuleName>'component:my-component',
          `export default Ember.Component.extend({
            bar: null
          });`
        );

        let [[barInv]] = subject.addPropertyInvocations(parentTemplate);
        let { prototypeProps: [barProp] } = subject.addEmberProps(
          childComponent
        );
        //precondition check
        assert.equal(subject.graph.edgeCount(), 0, 'no edges connected yet');
        let [{v, w}] = subject.connectInvokedAttrs();
        assert.equal(subject.graph.edgeCount(), 1, 'graph has one edge');
        assert.ok(
          subject.graph.hasEdge(v.propertyGraphKey, w.propertyGraphKey)
        );
        assert.equal(v.dotGraphKey, barInv.dotGraphKey);
        assert.equal(w.dotGraphKey, barProp.dotGraphKey);
      }
    );
    it('creates an implicit prototype property if one does not exist', function() {
      let registry = new Registry(new Resolver());
      let renderGraph = new RenderGraph(registry);
      let subject = new PropertyGraph(registry, renderGraph);
      let parentTemplate = registry.registerModule(
        <FilePath>'foo',
        <ModuleName>'template:foo',
        `{{my-component bar="baz"}}`
      );
      let childComponent = registry.registerModule(
        <FilePath>'my-component',
        <ModuleName>'component:my-component',
        `export default Ember.Component.extend({
        });`
      );

      let [[barInv]] = subject.addPropertyInvocations(parentTemplate);
      //precondition check
      assert.equal(subject.graph.edgeCount(), 0, 'no edges connected yet');
      let [{v, w}] = subject.connectInvokedAttrs();
      assert.equal(subject.graph.edgeCount(), 1, 'graph has one edge');
      assert.ok(subject.graph.hasEdge(v.propertyGraphKey, w.propertyGraphKey));
      assert.equal(v.dotGraphKey, barInv.dotGraphKey);
      assert.equal(w.nodeType, 'prototypeProperty');
    });
    xit('does nothing if the invocation targets a template', function() {});
  });
  describe('connectBindingsToContexts', function() {
    it('connects a binding node to a prototype property in the context of the same name', function() {});
    it('connects a binding node to an implicit prototype property in the context of the same name', function() {});
    it('will connect to a property in a mixin if needed', function() {});
  });
});
