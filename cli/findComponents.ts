import { getFiles } from './runFiles'
import * as path from 'path'
import * as recast from 'recast'
import * as fs from 'fs'
let babel = require('babel-core');

interface Property {
    name: string;
    line: number;
    isComputed: boolean;
}

export function findProps(componentPath: string): Property[] {
    let src = fs.readFileSync(componentPath, 'utf8');
    let ast = recast.parse(src, {esprima: babel});
    
    recast.visit(ast, {
        visitExportDefaultDeclaration: function(path) {
            let node = path.node;
            let args = node.declaration.arguments;
            let directProps = args[args.length - 1].properties;
            let nonFuncs = directProps.filter((p) => p.value.type !== "FunctionExpression");
            console.log(nonFuncs);
            this.traverse(path);
        }
    })
    
    return [];
}

export class ComponentDefinition {
    name: string;
    filePath: string;
    props: any[];

    constructor(filePath: string) {
        this.filePath = filePath;
        let isPod = filePath.indexOf('pods') > 0;
        if (isPod) {
            this.name = filePath.split('pods/components/')[1].split('/component.js')[0]
        } else {
            let parts = filePath.split('/')
            this.name = path.basename(parts[parts.length - 1])
        }
        this.props = [];
        
    }
}


export function findComponentFiles(appRoot: string): Array<string> {
  let podComponents = getFiles(path.join(appRoot, 'components'), '.js');
  let nonPodComponents = getFiles(path.join(appRoot, 'pods/components'), '.js');
  
  return [].concat(podComponents, nonPodComponents);
}
