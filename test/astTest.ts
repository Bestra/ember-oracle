import { parseJs } from '../lib/util/parser'

import * as ast from '../lib/ember/ast'

describe('', function() {
   beforeEach(function() {
       let src = `
       let component = Ember.Component.extend({
           foo: "bar"
       });
       
       export default component`
   })
})