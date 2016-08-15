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
    filePath: string;
    consumedKeys: string[];

    constructor(astNode, parentClass: EmberClass) {
        let {loc: {start: {line, column}}, key: {name}} = astNode;
        this.name = name;
        this.position = { line, column };
        this.parentClass = parentClass;
        this.filePath = parentClass.filePath;
        this.consumedKeys = AST.findConsumedKeys(astNode);
    }
}

class Action extends Property { }

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
        .map(name => {
            let aPath = AST.findImportPathForIdentifier(ast, name);
            if (!aPath || !lookupByAppPath(aPath)) {
                console.log("Unable to find module for ", name, " looking in ", aPath);
                return new EmptyEmberClass("component:ember");
            } else {
                return lookupByAppPath(aPath).definition;
            }
        }).value()

    return mixins;

}

function extractSuperClass(ast): EmberClass {
    let name = AST.superClassIdentifier(ast);
    let emberNames = ['Ember', 'Component', 'Route', 'Controller', 'View', 'Mixin']
    if (_.indexOf(emberNames, name) > -1 || !name) {
        return new EmptyEmberClass("component:ember"); //TODO make this a null object
    }
    let importPath = AST.findImportPathForIdentifier(ast, name);

    if (!importPath || !lookupByAppPath(importPath)) {
        console.log("Unable to find module for ", name, " looking in ", importPath);

        return new EmptyEmberClass("component:ember");
    } else {
        return lookupByAppPath(importPath).definition;
    }

}

function emptyDict<T>(): Dict<T> {
    return {};
}

export default class EmberClass {
    moduleName: string;
    filePath: string;

    get superClass(): EmberClass {
        return extractSuperClass(this.ast);
    }
    get mixins(): EmberClass[] {
        return extractMixins(this.ast);
    }

    _ast: any;
    get ast() {
        if (this._ast) { return this._ast; }

        let src = fileContents(this.moduleName);
        this._ast = parseJs(src);
        return this._ast;
    }

    get properties(): Dict<Property> {
        let superProps = this.superClass.properties;
        let mixinProps = this.mixins.map(m => m.properties);
        // console.log("super props are ", _.keys(superProps))
        let localProps = extractProps(this.ast, this);
        return _.assign<Dict<Property>, Dict<Property>>({}, superProps, ...mixinProps, localProps);
    }

    get actions(): Dict<Action> {
        let superActions = this.superClass.actions;
        let mixinActions = this.mixins.map(m => m.actions);

        // console.log("super actions are ", _.keys(superActions))
        let localActions = extractActions(this.ast, this);
        return _.assign<Dict<Action>, Dict<Action>>({}, superActions, ...mixinActions, localActions);
    }

    constructor(moduleName, filePath) {
        this.moduleName = moduleName;
        this.filePath = filePath;
    }
}

export class EmptyEmberClass extends EmberClass {
    get superClass() {
        return null;
    }

    get mixins() {
        return [];
    }

    constructor(moduleName) {
        super(moduleName, "NO FILE");
    }

    get properties() {
        return emptyDict<Property>();
    }

    get actions() {
        return emptyDict<Action>();
    }
}