/**
 * A variable of any kind in the template
 */

import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'
import * as path from 'path'
import * as fs from 'fs'

export interface Template {
    filePath;
    source;
}

//block params' context is really the block helper's template
//if it's not a block param the component's context is the template it's rendered in.
//1. walk Program nodes and get their block params
//2. walk PathExpression nodes.
//3. if our variable is a pathexpression whose parts contain a block param do something
//4. otherwise do something else

function withinProgram(program: htmlBars.Program, position: htmlBars.Position): boolean {
    return program.loc.start.line < position.line && program.loc.end.line > position.line;
}

type VariableDef = [("blockParam" | "path"), htmlBars.Position]
export function parseVariableDef(template: Template, name: string, position: htmlBars.Position): VariableDef {
    let ast = htmlBars.parse(template.source);
    let programs: htmlBars.Program[] = [];
    htmlBars.traverse(ast, {
        Program: {
            enter(node: htmlBars.Program) {
                programs.push(node);
            }
        }
    });
    let blockProvider = programs
        .filter(prog => withinProgram(prog, position))
        .find(prog => prog.blockParams.indexOf(name) > -1);

    if (blockProvider) {
        return ["blockParam", blockProvider.loc.start];
    } else {
        return ["path", position];
    }


}

export function contextForDef(def: VariableDef, templatePath: string): string {
    if (def[0] === "path") {
        if (templatePath.match("/pods/components")) {
            return templatePath.replace("template.hbs", "component.js");
        } else if (templatePath.match("/pods/")) {
            return path.dirname(templatePath) + "/controller.js";
        } else if (templatePath.match("templates/components/")) {
            return templatePath.split("templates/").join('').replace(".hbs", ".js");
        } else if (templatePath.match("/templates/")) {
            return templatePath.replace("/templates/", "/controllers/").replace(".hbs", ".js");
        }
    }
}

export default function findDefinition(template: Template, variableName: string, line: number, column: number): any {
    return parseVariableDef(template,
        variableName,
        { line: line, column: column });

}