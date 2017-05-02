import { parseJs } from '../lib/util/parser'
import findRoutes from '../lib/ember/routeGraph'
import * as assert from 'assert'

describe('the route tree', function () {
    describe('nested routes', function () {
        let src = `let Router = Ember.Router.extend({
        location: config.locationType
        });

        Router.map(function() {
            this.route('dashboard', {path: 'dash'}, function() {
                this.route('edit');
            });
            this.route('widget-factory', function() {
                this.route('new');
            });
        });
        `
        let ast = parseJs(src)
        it('has a top application route and children', function () {
            let root = findRoutes(ast);
            assert.equal(root.name, 'application')
            assert.ok(root.children);
            if (root.children) {
                assert.equal(root.children.length, 2);
            let dashboardRoute = root.children[0];
            assert.equal(dashboardRoute.children!.length, 1);
            }
            
        })

        it('the application route has the "application" module');
        it('routes below it do not start with "application" in the module names')       
    })

    describe('resetNamespace', function() {
      it("the resetNamespace option is respected for routes", function() {
        
      })
    })

    describe('resources', function () {
        it('detects legacy nested resources too');
        it('resources reset their module namespace');
    })

})