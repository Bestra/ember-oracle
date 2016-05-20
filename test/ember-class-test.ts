let td = require('testdouble');
import * as assert from 'assert'
afterEach(function () {
  td.reset();
})

describe('superClass', function() {
  
})
describe('EmberClass', function () {
  var registry, subject, EmberClass;
  beforeEach(function () {
    registry = td.replace('../lib/util/registry');
    EmberClass = require('../lib/ember/emberClass').default;
    subject = new EmberClass("component:child");
  });

  describe('component is an Ember subclass', function () {
    beforeEach(function () {
      let childSrc =
        `
        import Ember from 'ember';
        export default Ember.Object.extend({
          childProp: Ember.inject.service()
        });
        `
      td.when(registry.fileContents("component:child")).thenReturn(childSrc);
    })

    it('properties returns a dictionary of props', function () {
      assert.ok(subject.properties['childProp']);
    });

    it('superclass is the default ember class', function () {
      assert.equal(subject.superClass.moduleName, 'component:ember');
    });
  });
  describe('component is some other subclass', function () {
    beforeEach(function () {
      let childSrc =
        `
          import Ember from 'ember';
          import TaskComponent from 'my-app/components/task';
          export default TaskComponent.extend({
            childProp: Ember.inject.service()
          });
          `
      let parentSrc =
        `export default Ember.Component.extend({parentProp: "foo"})`
      td.when(registry.lookupByAppPath('my-app/components/task')).thenReturn(
        {definition: new EmberClass("component:task")}
      )
      td.when(registry.fileContents("component:child")).thenReturn(childSrc);
      td.when(registry.fileContents("component:task")).thenReturn(parentSrc);
    })

    it('properties returns a dictionary of props', function () {
      assert.ok(subject.properties['childProp']);
      assert.ok(subject.properties['parentProp']);
    });

  });
});