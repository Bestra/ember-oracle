import * as path from 'path'
import * as recast from 'recast'
import * as fs from 'fs'
import * as _ from 'lodash'

let babel = require('babel-core');
import * as AST from '../ember/ast'
import { lookup, fileContents, lookupByAppPath } from '../util/registry'
type Position = { line: number; column: number }
type Prop = { [index: string]: Position }
interface Dict<T> {
    [index: string]: T
}

function defaultExportProps(ast) {
    let directProps: AST.Property[] = [];
    recast.visit(ast, {
        visitExportDefaultDeclaration: function ({node: {declaration}}) {
            let args = declaration.arguments;
            if (args && args.length) {
                directProps = _.last<any>(args).properties;
            }
            return false;
        }
    })
    return directProps;
}


function extractProps(ast, filePath) {
    let dict: Dict<Property> = {};

    defaultExportProps(ast).filter(({value, key}) => {
        return value.type !== "FunctionExpression" &&
            key.name !== "actions";
    }).forEach((k) => {
        let newProp = new Property(k, filePath);
        dict[newProp.name] = newProp;
    })

    return dict;
}

function extractActions(ast, filePath) {
    let dict: Dict<Action> = {};
    let actionsHash: any = _.find(defaultExportProps(ast), { key: { name: "actions" } });
    if (actionsHash) {
        actionsHash.value.properties.forEach((p) => {
            let a = new Action(p, filePath);
            dict[a.name] = a;
        })
        return dict;
    }
}

class Property {
    parentClass: EmberClass;
    position: Position
    name: string;
    filePath: string;

    constructor(astNode, filePath) {
        let {loc: {start: {line, column}}, key: {name}} = astNode;
        this.name = name;
        this.position = { line, column };
        this.filePath = filePath;
    }
}

class Action extends Property {

}

function rootIdentifier(memberExpr: any) {
    let findRoot = (aNode) => {
        if (aNode.type === "Identifier") {
            return aNode.name;
        } else if (aNode.object.type === "MemberExpression") {
            return findRoot(aNode.object);
        } else {
            return null;
        }
    }
    return findRoot(memberExpr);
}

function superClassIdentifier(ast) {
    let name: string;
    recast.visit(ast, {
        visitExportDefaultDeclaration: function ({node: {declaration}}) {
            if (declaration.callee) {
                let typeExpr = declaration.callee.object
                name = rootIdentifier(typeExpr)
            } else {
                name = null;
            }
            return false;
        }
    })
    return name;
}

function findImportPathForIdentifier(ast, name: string): string {
    let importPath = null;
    recast.visit(ast, {
        //for some reason the nodePath here conforms to a different spec than the other
        //paths, hence the funny business
        visitImportDefaultSpecifier: function (path) {
            if (path.value.local.type === "Identifier" && path.value.local.name === name) {
                importPath = path.parentPath.node.source.value;
            }
            return false;
        }
    });
    return importPath;
}

function extractMixins(ast): EmberClass[] {
    let mixinArgs: any[];

    recast.visit(ast, {
        visitExportDefaultDeclaration: function ({node: {declaration}}) {
            let args: any[] = declaration.arguments;
            if (args && args.length > 1) {
                mixinArgs = args.slice(0, -1);
            } else {
                mixinArgs = [];
            }
            return false;
        }
    })

    let mixins = _(mixinArgs)
        .filter({ type: "Identifier" })
        .map<string>('name')
        .map(name => findImportPathForIdentifier(ast, name))
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
    let name = superClassIdentifier(ast);
    let emberNames = ['Ember', 'Component', 'Route', 'Controller', 'View']
    if (_.indexOf(emberNames, name) > -1 || !name) {
        return new EmptyEmberClass("component:ember"); //TODO make this a null object
    }
    console.log("superclass name is ", name)
    let importPath = findImportPathForIdentifier(ast, name);

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

    get filePath() {
        return lookup(this.moduleName).filePath;
    }

    _ast: any;
    get ast() {
        if (this._ast) { return this._ast; }

        let src = fileContents(this.moduleName);
        this._ast = recast.parse(src, { esprima: babel });
        return this._ast;
    }

    get properties() {
        let superProps = this.superClass.properties;
        let mixinProps = this.mixins.map(m => m.properties);
        console.log("super props are ", _.keys(superProps))
        let localProps = extractProps(this.ast, this.filePath);
        return _.assign({}, superProps, ...mixinProps, localProps);
    }

    get actions() {
        let superActions = this.superClass.actions;
        let mixinActions = this.mixins.map(m => m.actions);

        console.log("super actions are ", _.keys(superActions))
        let localActions = extractActions(this.ast, this.filePath);
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