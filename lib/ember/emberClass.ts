import * as path from 'path'
import * as recast from 'recast'
import * as fs from 'fs'
import * as _ from 'lodash'

let babel = require('babel-core');
import * as AST from '../ember/ast'
import {lookup, fileContents} from '../util/registry'
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
            console.log(args)
            if (args && args.length) {
                directProps = _.last<any>(args).properties;
            }
            return false;
        }
    })
    return directProps;
}

function extractProps(ast) {
    let dict: Dict<Property> = {};

    defaultExportProps(ast).filter(({value, key}) => {
        return value.type !== "FunctionExpression" &&
            key.name !== "actions";
    }).forEach((k) => {
        let newProp = new Property(k);
        dict[newProp.name] = newProp;
    })

    return dict;
}

function extractActions(ast) {
    let dict: Dict<Action> = {};
    let actionsHash: any = _.find(defaultExportProps(ast), { key: { name: "actions" } });
    if (actionsHash) {
        actionsHash.value.properties.forEach((p) => {
            let a = new Action(p);
            dict[a.name] = a;
        })
        return dict;
    }
}


class Property {
    position: Position
    name: string;

    constructor(astNode) {
        let {loc: {start: {line, column}}, key: {name}} = astNode;
        this.name = name;
        this.position = { line, column }
    }
}

class Action extends Property {

}


function importForIdentifier(programAst, identifierNode) {

}

function moduleFromImport() {

}

function memberExpressions(node: any) {
    let members = [];
    let _findMembers = (node) => {
        console.log(`node.object: ${node.object.name}`)
        console.log(`node.property: ${node.property.name}`)
        if (node.object) {
            members.push(node.object);

        }
        if (node.object.object) {
            _findMembers(node.object)
        }
        if (node.property) {

            members.push(node.property)
        }

    }
    _findMembers(node);
    return members.map(n => n.name);
}

function superClassIdentifiers(ast) {
    let names;
    recast.visit(ast, {
        visitExportDefaultDeclaration: function ({node: {declaration}}) {
            let typeExpr = declaration.callee.object
            names = memberExpressions(typeExpr)
            return false;
        }
    })
    return names;
}

export default class EmberClass {
    moduleName: string;

    get superClass(): EmberClass {
        return superClassIdentifiers(this.ast);
    }
    get mixins(): EmberClass[] {
        return []
    }

    _ast: any;
    get ast() {
        if (this._ast) { return this._ast; }

        let src = fileContents(this.moduleName);
        this._ast = recast.parse(src, { esprima: babel });
        return this._ast;
    }

    get properties() {
        return extractProps(this.ast)
    }

    get actions() {
        return extractActions(this.ast);
    }

    constructor(moduleName) {
        this.moduleName = moduleName;
    }

}