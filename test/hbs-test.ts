
import * as assert from 'assert'
import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as hbs from '../lib/hbs'
import findPathDefinition from '../lib/hbs'

describe("extractBlockParam", function() {
    it("returns undefined for plain paths", function() {
        let src =
            `
        <div>{{foo}}</div>
        `;
        let template = {
            filePath: 'app/pods/components/foo-bar/template.hbs',
            source: src
        };
        let pos: htmlBars.Position = { column: 9, line: 2 };
        let param = hbs.extractBlockParam(template, 'foo', pos);
        assert.equal(param, undefined);
    });
    it("works for block params", function() {
        let src =
            `
{{#fiveyss/stuff-bar as |foo bar|}}
My name is {{foo}}
Dude
{{/fiveyss/stuff-bar}}
        `;
        let template = {
            filePath: 'app/pods/components/foo-bar/template.hbs',
            source: src
        };
        let pos: htmlBars.Position = { column: 17, line: 4 };
        let param = hbs.extractBlockParam(template, 'foo', pos);
        assert.equal(param.name, 'foo');
        assert.equal(param.sourceModule, "template:components/fiveyss/stuff-bar");
        assert.equal(param.index, 0);
    });
    it("works for block params that aren't yielded from a component", function() {
        let src =
            `
{{#each things as |thing|}}
My name is {{thing}}
{{/each}}
        `;
        let template = {
            filePath: 'app/pods/components/foo-bar/template.hbs',
            source: src
        };
        let pos: htmlBars.Position = { column: 15, line: 3 };
        let param = hbs.extractBlockParam(template, 'thing', pos);
        assert.equal(param.name, 'thing');
        assert.equal(param.sourceModule, 'template:components/foo-bar');
        assert.equal(param.index, 0);
    });
});

describe('findPathDefinition', function() {
    describe("paths that haven't been yielded", function() {
        it("returns the rendering context for plain paths", function() {
            let template = {
                filePath: 'app/pods/components/foo-bar/template.hbs',
                source: `<div>{{foo}}</div>`
            };
            let pos: htmlBars.Position = { column: 8, line: 1 };
            let param = findPathDefinition(template, 'foo', pos)
            assert.equal(param.sourceModule, "component:foo-bar", "the context for a component template is the component");
            
            template.filePath = "app/pods/dashboard/index/template.hbs";
            assert.equal(
                findPathDefinition(template, 'foo', pos).sourceModule,
                "controller:dashboard/index",
                "the context for any other template is the controller"
            );
            template.filePath = "app/templates/dashboard/index.hbs";
            assert.equal(
                findPathDefinition(template, 'foo', pos).sourceModule,
                "controller:dashboard/index",
                "works for non-pods too"
            );   
        });

    });
    describe('yielded block params', function() {
      describe('from a component', function() {
           let src =            
`{{#fiveyss/stuff-bar as |foo bar|}}
My name is {{bar}}
Dude
{{/fiveyss/stuff-bar}}`;
        let template = {
            filePath: 'app/pods/components/foo-bar/template.hbs',
            source: src
        };
        it('returns the template that yielded the block param', function() {
            let def = findPathDefinition(template, 'bar', { line: 2, column: 16 }) as any;
            assert.equal(
                def.sourceModule,
                "template:components/fiveyss/stuff-bar",
                "returns the template that yielded the block param"
            );
            assert.ok(def.blockNode, 'it returns the block itelf in the definition');
            assert.equal(def.index, 1, 'returns the index of the block param');   
        })
        
      });
      describe('from another helper', function() {
          let src =
`{{#each things as |thing|}}
My name is {{thing}}
{{/each}}`;
        let template = {
            filePath: 'app/pods/components/foo-bar/template.hbs',
            source: src
        };
        it('returns null with the block for the helper', function() {
            let def = findPathDefinition(template, 'thing', { line: 2, column: 16 }) as any;
            assert.equal(
                def.sourceModule,
                'template:components/foo-bar',
                "the sourceModule should be the current template"
            );
            assert.ok(def.blockNode, 'it returns the block itelf in the definition');
            assert.equal(def.index, 0, 'returns the index of the block param'); 
          
        })
        
      })
    })

})