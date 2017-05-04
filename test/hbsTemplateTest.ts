let td = require('testdouble');
import * as assert from 'assert'
import * as hbs from '../lib/hbs'
import Registry from '../lib/util/registry'
import Resolver from '../lib/util/resolver'
import { Template } from '../lib/hbs'
afterEach(function () {
  td.reset();
})

describe('Template', function () {
  var registry, subject;
  beforeEach(function () {
    registry = td.object(new Registry(new Resolver()));
    subject = new Template("template:foo", "foo", registry);
  })
  describe('template src is available in the registry', function () {
    beforeEach(function () {
      td.when(registry.fileContents("template:foo"))
        .thenReturn(
        `<div>Test</div>
{{foo.bar.baz}}
{{#each cats as |cat|}}
    {{cat.name}}
{{/each}}
{{partial 'sharedStuff'}}
{{util/mustache-component name=foo tagName="span"}}
{{#util/block-component name=foo tagName="span" as |yield1 yield2|}} 
  {{yield1.stuff}}                  
{{/util/block-component}}`
        );
    })

    it('astNode returns an htmlbars program ast', function () {
      assert.equal(subject.astNode.type, "Program");
    })

    describe('partials', function() {
      it('returns the partial', function() {
        assert.equal(subject.partials.length, 1);
        assert.equal(subject.partials[0].templatePath, 'sharedStuff')
      })
    })
    describe('blocks', function () {
      it('returns the 2 blocks in the program', function () {
        assert.equal(subject.blocks.length, 2)
        let [eachBlock, componentBlock] = subject.blocks;
        assert.equal(eachBlock.pathString, 'each');
        assert.equal(componentBlock.pathString, 'util/block-component');
      })
    })

    describe('components', function () {
      it('returns no components when the registry is empty', function () {
        assert.equal(subject.components.length, 0)
      })
      it('finds components using the registry', function () {
        td.when(registry.findComponent('util/mustache-component'))
          .thenReturn(true);
        td.when(registry.findComponent('util/block-component'))
          .thenReturn(true);
        assert.equal(
          subject.components.length,
          2,
          'finds both types of components'
        )
      })
    })

    describe('parsePosition', function () {
      let parse = function <T extends hbs.Defineable>(l, c) {
        return subject.parsePosition({ line: l, column: c }) as T
      }
      let assertType = (obj, expected) => {
        let actualType = Object.getPrototypeOf(obj).constructor.name
        assert.equal(actualType,
          expected,
          `expected ${actualType} to be of type ${expected}`);
      }
      it('returns a plain path from anywhere in the path', function () {
        td.when(registry.fileContents("template:foo"))
          .thenReturn(`{{foo.bar.baz}}`);
        assert.equal(parse<hbs.Path>(1, 2).root, 'foo');
        assert.equal(parse<hbs.Path>(1, 8).root, 'foo');
        assert.equal(parse<hbs.Path>(1, 9).astNode.original, 'foo.bar.baz');
      })
      it('returns a block param', function () {
        td.when(registry.fileContents("template:foo"))
          .thenReturn(
          `{{#each things as |foo|}}{{foo.bar.baz}}{{/each}}`
          );
        let result = parse<hbs.BlockParam>(1, 29)
        assertType(result, 'BlockParam');
        assert.equal(result.root, 'foo', 'still acts like a path');
        assertType(result.block, 'Block');
        assert.equal(result.block.pathString, 'each')
      })
      it('returns a block param for dashed helpers', function () {
        td.when(registry.fileContents("template:foo"))
          .thenReturn(
          `{{#my-thing things as |foo|}}{{foo.bar.baz}}{{/my-thing}}`
          );
        let pathResult = parse<hbs.BlockParam>(1, 40)
        assertType(pathResult, 'BlockParam');
        assert.equal(pathResult.block.pathString, 'my-thing')
      })
      it(`returns the containing component if the search hits the mustache path
      and the component is defined`, function () {
          td.when(registry.fileContents("template:foo"))
            .thenReturn(
            `{{#my-component things as |foo|}}{{foo.bar.baz}}{{/my-component}}`
            );
          td.when(registry.findComponent('my-component'))
            .thenReturn(true);
          let pathResult = parse<hbs.ComponentInvocation>(1, 5)
          assertType(pathResult, 'ComponentInvocation');
          assert.equal(pathResult.pathString, 'my-component')
        })
      describe('actions', function () {
        describe('top level actions from the rendering context', function () {
          it('works as an element modifier', function () {
            td.when(registry.fileContents("template:foo"))
              .thenReturn(
              `<div {{action "clicked"}}>Hey</div>`
              );
            let pathResult = parse<hbs.Action>(1, 17)
            assertType(pathResult, 'Action');
            assert.equal(pathResult.name, 'clicked')

          });
          it('created via foo=(action "bar")', function () {
            td.when(registry.fileContents("template:foo"))
              .thenReturn(
              `{{my-component foo=(action "clicked")}}`
              );
            let pathResult = parse<hbs.Action>(1, 31)
            assertType(pathResult, 'Action');
            assert.equal(pathResult.name, 'clicked')
          });
        });
      })
    })
  })
})