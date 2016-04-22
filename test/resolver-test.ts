import * as resolver from '../lib/util/resolver'
import * as assert from 'assert'
import * as _ from 'lodash'
describe("the resolver", function() {
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