let td = require("testdouble");
import * as _ from "lodash";
import * as assert from "assert";
import Registry from "../lib/util/registry";
import EmberClass from "../lib/ember/emberClass";
import { ModuleName, FilePath } from "../lib/util/types";
afterEach(function() {
  td.reset();
});

describe("PropertyGraph", function() {
  describe("addTemplateBindings", function() {
      describe('boundPaths', function() {
        it('adds a node to the graph', function() {
          
        });
        describe('with a block param', function() {
          it('adds the block param node to the graph', function() {
            
          });
          it('adds an edge between the bound path node and the block param node', function() {
            
          });
        });
      });
  });
  describe('addPropertyInvocations', function() {
    it('adds a node for each invoked attribute', function() {
      
    });
  });

  describe('addEmberProps', function() {
    describe('property gets', function() {
      it('adds a node to the graph', function() {
        
      });
    });
     describe('property sets', function() {
      it('adds a node to the graph', function() {
        
      });
    });
     describe('prototype assignments', function() {
      it('adds a node to the graph', function() {
        
      });
    });
  });
});
