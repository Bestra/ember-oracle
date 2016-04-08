import * as resolver from '../lib/util/resolver'
import * as assert from 'assert'
import * as _ from 'lodash'
describe("the resolver", function() {
    describe("translating modules to paths", function() {
        describe('createPath', function() {

            let assertPath = (isPod, module, path) => {
                assert.equal(resolver.createPath(isPod, module), path);
            };
            describe('pods', function() {
                let assertPod = _.partial(assertPath, true);
                it('works for component js', function() {
                    assertPod("component:foo", "app/pods/components/foo/component.js");
                    assertPod("component:foo/bar", "app/pods/components/foo/bar/component.js");
                });
                it('works for non-component js stuff', function() {
                    assertPod("controller:foo", "app/pods/foo/controller.js");
                    assertPod("controller:foo/bar", "app/pods/foo/bar/controller.js");
                });
                it('works for templates', function() {
                    assertPod("template:foo/bar", "app/pods/foo/bar/template.hbs");
                    assertPod("template:components/foo/bar", "app/pods/components/foo/bar/template.hbs");
                })

            });
            describe('sans pods', function() {
                let check = _.partial(assertPath, false);
                it('works for component js', function() {
                    check("component:foo-stuff", "app/components/foo-stuff.js");
                    check("component:foo/bar-stuff", "app/components/foo/bar-stuff.js");
                });
                it('works for non-component js stuff', function() {
                    check("controller:foo", "app/controllers/foo.js");
                    check("controller:foo/bar", "app/controllers/foo/bar.js");
                });
                it('works for templates', function() {
                    check("template:foo/bar", "app/templates/foo/bar.hbs");
                    check("template:components/foo/bar-stuff", "app/templates/components/foo/bar-stuff.hbs");
                })

            });
        });
    });
});