import * as path from 'path'
import * as recast from 'recast'
import * as fs from 'fs'

let babel = require('babel-core');
import * as AST from '../ember/ast'

type Prop = {[index: string]: {line: number; column: number}}
export function findProps(jsPath: string){ 
    let src = fs.readFileSync(jsPath, 'utf8');   
    let ast = recast.parse(src, {esprima: babel});
    let propList: Prop = {};
    recast.visit(ast, {
        visitExportDefaultDeclaration: function(path) {
            let node = path.node;
            let args = node.declaration.arguments;
            if (args && args.length) {
            let directProps: AST.Property[] = args[args.length - 1].properties;
            directProps.filter((p) =>  {
                return p.value.type !== "FunctionExpression" &&
                p.key.name !== "actions";
            }).forEach((k) => {
                propList[k.key.name] = {line: k.loc.start.line, column: k.loc.start.column}
            })
        }
            
            this.traverse(path);
        }
    })
    
    return propList;
}