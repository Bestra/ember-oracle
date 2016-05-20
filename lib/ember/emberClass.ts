import * as path from 'path'
import * as recast from 'recast'
import * as fs from 'fs'
import * as _ from 'lodash'
import { parseJs } from '../util/parser'

import * as AST from '../ember/ast'
import { lookup, fileContents, lookupByAppPath } from '../util/registry'
type Position = { line: number; column: number }
type Prop = { [index: string]: Position }
interface Dict<T> {
    [index: string]: T
}

class Property {
    parentClass: EmberClass;
    position: Position
    name: string;

    constructor(astNode, parentClass: EmberClass) {
        let {loc: {start: {line, column}}, key: {name}} = astNode;
        this.name = name;
        this.position = { line, column };
        this.parentClass = parentClass;
    }
}

class Action extends Property {}

function extractProps(ast, parent: EmberClass) {
    let dict: Dict<Property> = {};

    AST.defaultExportProps(ast).filter(({value, key}) => {
        return value.type !== "FunctionExpression" &&
            key.name !== "actions";
    }).forEach((k) => {
        let newProp = new Property(k, parent);
        dict[newProp.name] = newProp;
    })

    return dict;
}

function extractActions(ast, parent: EmberClass) {
    let dict: Dict<Action> = {};
    let actionsHash: any = _.find(AST.defaultExportProps(ast), { key: { name: "actions" } });
    if (actionsHash) {
        actionsHash.value.properties.forEach((p) => {
            let a = new Action(p, parent);
            dict[a.name] = a;
        })
        return dict;
    }
}


function extractMixins(ast): EmberClass[] {
    let mixins = _(AST.extractMixinIdentifiers(ast))
        .map(name => AST.findImportPathForIdentifier(ast, name))
        .map((aPath) => {
            if (!aPath) {
                console.log("Unable to find import path for ", name);
                return new EmptyEmberClass("component:ember");
            }
            console.log("looking up ", aPath)
            let m: EmberClass = lookupByAppPath(aPath).definition;
            console.log("mixin found: ", m)
            return m;
        }).value()

    return mixins;

}

function extractSuperClass(ast): EmberClass {
    let name = AST.superClassIdentifier(ast);
    let emberNames = ['Ember', 'Component', 'Route', 'Controller', 'View']
    if (_.indexOf(emberNames, name) > -1 || !name) {
        return new EmptyEmberClass("component:ember"); //TODO make this a null object
    }
    console.log("superclass name is ", name)
    let importPath = AST.findImportPathForIdentifier(ast, name);

    if (!importPath) {
        console.log("Unable to find import path for ", name);
        return new EmptyEmberClass("component:ember");
    }
    let sc = lookupByAppPath(importPath).definition;
    console.log("superclass found: ", sc)
    return sc;

}

function emptyDict<T>(): Dict<T> {
    return {};
}

export default class EmberClass {
    moduleName: string;

    get superClass(): EmberClass {
        return extractSuperClass(this.ast);
    }
    get mixins(): EmberClass[] {
        return extractMixins(this.ast);
    }

    get filePath(): string {
        return lookup(this.moduleName).filePath;
    }

    _ast: any;
    get ast() {
        if (this._ast) { return this._ast; }

        let src = fileContents(this.moduleName);
        this._ast = parseJs(src);
        return this._ast;
    }

    get properties() {
        let superProps = this.superClass.properties;
        let mixinProps = this.mixins.map(m => m.properties);
        console.log("super props are ", _.keys(superProps))
        let localProps = extractProps(this.ast, this);
        return _.assign({}, superProps, ...mixinProps, localProps);
    }

    get actions() {
        let superActions = this.superClass.actions;
        let mixinActions = this.mixins.map(m => m.actions);

        console.log("super actions are ", _.keys(superActions))
        let localActions = extractActions(this.ast, this);
        return _.assign({}, superActions, ...mixinActions, localActions);
    }

    constructor(moduleName) {
        this.moduleName = moduleName;
    }
}

export class EmptyEmberClass extends EmberClass {
    get superClass() {
        return null;
    }

    get mixins() {
        return [];
    }

    get properties() {
        return emptyDict<Property>();
    }

    get actions() {
        return emptyDict<Action>();
    }
}