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

    describe("translating path into modules", function() {
        let assertModule = (path, module) => {
            assert.equal(resolver.moduleNameFromPath(path), module);
        };

        it('turns pod paths starting with app/ into module names', function() {
            assertModule("app/pods/foo/bar/controller.js", "controller:foo/bar");
            assertModule("app/pods/foo/bar/route.js", "route:foo/bar");
            assertModule("app/pods/foo/bar/template.hbs", "template:foo/bar");
            assertModule("app/pods/components/foo/bar-baz/template.hbs", "template:components/foo/bar-baz");
            assertModule("app/pods/components/foo/bar-baz/component.js", "component:foo/bar-baz");
        });
        it('turns non-pod paths starting with app/ into module names', function() {
            assertModule("app/controllers/foo/bar.js", "controller:foo/bar");
            assertModule("app/routes/foo/bar.js", "route:foo/bar");
            assertModule("app/templates/foo/bar.hbs", "template:foo/bar");
            assertModule("app/templates/components/foo/bar-baz.hbs", "template:components/foo/bar-baz");
            assertModule("app/components/foo/bar-baz.js", "component:foo/bar-baz");
        });
    });
});