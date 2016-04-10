
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
        let template: hbs.Template = {
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
        let template: hbs.Template = {
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
        let template: hbs.Template = {
            filePath: 'app/pods/components/foo-bar/template.hbs',
            source: src
        };
        let pos: htmlBars.Position = { column: 15, line: 3 };
        let param = hbs.extractBlockParam(template, 'thing', pos);
        assert.equal(param.name, 'thing');
        assert.equal(param.sourceModule, null);
        assert.equal(param.index, 0);
    });
});

describe('findPathDefinition', function() {
    describe("paths that haven't been yielded", function() {
        it("returns the rendering context for plain paths", function() {
            let template: hbs.Template = {
                filePath: 'app/pods/components/foo-bar/template.hbs',
                source: `<div>{{foo}}</div>`
            };
            let pos: htmlBars.Position = { column: 8, line: 1 };
            let param = findPathDefinition(template, 'foo', pos)
            assert.equal(param.sourceModule, "component:foo-bar");
        });

    })

})