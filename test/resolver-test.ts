import * as resolver from '../lib/util/resolver'
import * as assert from 'assert'
import * as _ from 'lodash'
describe("the resolver", function () {
    let rootPath = "path/to/my/app/client/";

    describe("translating path into modules", function () {
        let assertModule = (fullPath, root, module) => {
            assert.equal(resolver.moduleNameFromPath(fullPath, root), module);
        };

        it('turns pod paths starting with app/ into module names', function () {
            assertModule(rootPath + "app/pods/foo/bar/controller.js", rootPath, "controller:foo/bar");
            assertModule(rootPath + "app/pods/foo/bar/route.js", rootPath, "route:foo/bar");
            assertModule(rootPath + "app/pods/foo/bar/template.hbs", rootPath, "template:foo/bar");
            assertModule(rootPath + "app/pods/components/foo/bar-baz/template.hbs", rootPath, "template:components/foo/bar-baz");
            assertModule(rootPath + "app/pods/components/foo/bar-baz/component.js", rootPath, "component:foo/bar-baz");
        });
        
        it('turns non-pod paths starting with app/ into module names', function () {
            assertModule(rootPath + "app/controllers/foo/bar.js", rootPath + "app/", "controller:foo/bar");
            assertModule(rootPath + "app/routes/foo/bar.js", rootPath + "app/", "route:foo/bar");
            assertModule(rootPath + "app/templates/foo/bar.hbs", rootPath + "app/", "template:foo/bar");
            assertModule(rootPath + "app/templates/components/foo/bar-baz.hbs", rootPath + "app/", "template:components/foo/bar-baz");
            assertModule(rootPath + "app/components/foo/bar-baz.js", rootPath + "app/", "component:foo/bar-baz");
        });
    });
    
    describe('filePathFromAppPath', function() {
      beforeEach(function () {
          resolver.setRootPath("/some/path/");
          resolver.appName = "testApp";
      })
      
      it('translates app paths into absolute paths', function() {
        assert.equal(resolver.filePathFromAppPath('testApp/mixins/foo'), '/some/path/app/mixins/foo.js');
      })
    })
});