import { parseJs } from '../lib/util/parser'
import findRoutes from '../lib/ember/routeGraph'
import * as assert from 'assert'

describe.only('the route tree', function () {
    describe('standard stuff', function () {
        let src = `let Router = Ember.Router.extend({
        location: config.locationType
        });

        Router.map(function() {
        this.route('dashboard', function() {});
        this.route('widget-factory', function() {});
        });
        `
        let ast = findRoutes(parseJs(src))
        it('has a top application route and children', function () {
            let root = findRoutes(ast);
            assert.equal(root.name, 'application')
            assert.equal(root.children.length, 2)
        })

    })
    describe('nested routes', function () {

    })

    describe('resources', function () {

    })

})