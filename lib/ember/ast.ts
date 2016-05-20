import * as path from 'path'
import * as recast from 'recast'
import * as fs from 'fs'
import * as _ from 'lodash'

import * as AST from '../ember/ast'
import { lookup, fileContents, lookupByAppPath } from '../util/registry'
type Position = { line: number; column: number }
type Prop = { [index: string]: Position }
interface Dict<T> {
    [index: string]: T
}

export interface Loc {
    line: number;
    column: number;
}

export interface Node {
    type: string;
    start: number;
    end: number;
    loc: {
        start: Loc;
        end: Loc;
    }
}

export interface NodePath {
    node: Node;
    parent: NodePath;
    scope;
}

export interface Property extends Node {
    key: { name: "string" };
    value: { type: "string" };
}

export function rootIdentifier(memberExpr: any) {
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

export function superClassIdentifier(ast) {
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

export function extractMixinIdentifiers(ast): string[] {
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

    return _(mixinArgs)
        .filter({ type: "Identifier" })
        .map<string>('name')
        .value();
}

export function findImportPathForIdentifier(ast, name: string): string {
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

export function defaultExportProps(ast) {
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
