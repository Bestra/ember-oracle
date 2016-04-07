
import * as assert from 'assert'
import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'

import * as hbs from '../lib/hbs'
describe("parseVariableDef", function() {
    it("works for plain paths", function() {
        let src =
            `
        <div>{{foo}}</div>
        `;
        let template: hbs.Template = {
            filePath: 'app/pods/components/foo-bar/template.hbs',
            source: src
        };
        let pos: htmlBars.Position = { column: 9, line: 2 };
        let stuff = hbs.parseVariableDef(template, 'foo', pos);
        assert.equal(stuff[0], "path");
        assert.equal(stuff[1].line, 2);
        assert.equal(stuff[1].column, 9);
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
        let stuff = hbs.parseVariableDef(template, 'foo', pos);
        assert.equal(stuff[0], "blockParam");
        assert.equal(stuff[1].line, 2);
        assert.equal(stuff[1].column, 0);
    });
});

describe("contextForDef", function() {
    describe("plain bound path", function() {
        let testPaths = (input, expected, msg) => {
            let context = hbs.contextForDef(["path", { column: 1, line: 1 }], input);
            assert.equal(context, expected, msg);
        }
        
        it("works", function() {
            
            testPaths(
                "app/pods/components/foo-bar/template.hbs",
                "app/pods/components/foo-bar/component.js",
                "component pod def");
            testPaths(
                "app/templates/components/foo-bar.hbs",
                "app/components/foo-bar.js",
                "non-pod component def");
            testPaths(
                "app/templates/foo-bar.hbs",
                "app/controllers/foo-bar.js",
                "default context is the controller");
            testPaths(
                "app/pods/stuff/foo-bar.hbs",
                "app/pods/stuff/controller.js",
            "default context is the controller, for pods too");
        })


    });
});