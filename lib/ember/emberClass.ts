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

function extractProps(ast) {
    let propList: Dict<Property> = {};
    recast.visit(ast, {
        visitExportDefaultDeclaration: function (path) {
            let node = path.node;
            let args = node.declaration.arguments;
            if (args && args.length) {
                let directProps: AST.Property[] = args[args.length - 1].properties;
                directProps.filter((p) => {
                    return p.value.type !== "FunctionExpression" &&
                        p.key.name !== "actions";
                }).forEach((k) => {
                    let p = new Property(k);
                    propList[p.name] = p;
                })
            }

            this.traverse(path);
        }
    })
    
    return propList;
}

function extractActions(ast) {
    let propList: Dict<Action> = {};
    
    recast.visit(ast, {
        visitExportDefaultDeclaration: function (path) {
            let node = path.node;
            let args = node.declaration.arguments;
            if (args && args.length) {
                let directProps = args[args.length - 1].properties;
                let actionsHash: any = _.find(directProps, {key: {name: "actions"}});
                if (actionsHash) {
                   actionsHash.value.properties.forEach((p) => {
                       let a = new Action(p);
                       propList[a.name] = a;
                   }) 
                } 
            }

            this.traverse(path);
        }
    })

    return propList;
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

export default class EmberClass {
    moduleName: string;

    get ast() {
        let src = fileContents(this.moduleName);
        return recast.parse(src, { esprima: babel });
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