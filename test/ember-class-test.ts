let td = require('testdouble');
import * as assert from 'assert'
afterEach(function () {
  td.reset();
})

let parentSrc = 
`export default Ember.Component.extend({parentProp: "foo"})`

let childSrc = 
`
import TaskComponent from 'my-app/components/task';
export default Ember.Object.Stuff.Things.extend({
  childProp: Ember.inject.service()
});
`
describe('EmberClass', function () {
  var registry, subject;
  beforeEach(function () {
    registry = td.replace('../lib/util/registry');
    var EmberClass = require('../lib/ember/emberClass').default;
    subject = new EmberClass("component:foo");
  });
  
  describe('component src is available in the registry', function () {
    beforeEach(function () {
      td.when(registry.fileContents("component:foo")).thenReturn(childSrc);
    })

    it('properties returns a dictionary of props', function () {
      assert.ok(subject.properties['childProp']);
    });
    
    it.only('superclass', function() {
      assert.equal(subject.superClass, 'TaskComponent');
    });
  });
});