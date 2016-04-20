let td = require('testdouble');
import * as assert from 'assert'
import * as hbs from '../lib/hbs'
afterEach(function () {
  td.reset();
})

describe('Template', function () {
  let registry, subject: hbs.Template;
  beforeEach(function () {
    registry = td.replace('../lib/util/registry');
    let { Template } = require('../lib/hbs');
    subject = new Template("template:foo");
  })
  describe('template src is a mustache with a path', function () {
    beforeEach(function () {
      td.when(registry.fileContents("template:foo"))
        .thenReturn(
        `<div>Test</div>
{{foo.bar.baz}}
{{#each cats as |cat|}}
    {{cat.name}}
{{/each}}
{{util/mustache-component name=foo tagName="span"}}
{{#util/block-component name=foo tagName="span" as |yield1 yield2|}} 
  {{yield1.stuff}}                  
{{/util/block-component}}`
        );
    })

    it('astNode returns an htmlbars program ast', function () {
      assert.equal(subject.astNode.type, "Program");
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
  })
})