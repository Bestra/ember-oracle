import { getFiles } from '../util/runFiles'
import * as path from 'path'
import * as recast from 'recast'
import * as fs from 'fs'
import * as ProgressBar from 'progress'

let babel = require('babel-core');

interface Property {
    name: string;
    line: number;
    isComputed: boolean;
}

export function findProps(componentPath: string): Property[] {
    let src = fs.readFileSync(componentPath, 'utf8');
    let ast = recast.parse(src, {esprima: babel});
    let propList = [];
    recast.visit(ast, {
        visitExportDefaultDeclaration: function(path) {
            let node = path.node;
            let args = node.declaration.arguments;
            if (args && args.length) {
            let directProps = args[args.length - 1].properties;
            propList = directProps.filter((p) =>  {
                return p.value.type !== "FunctionExpression" &&
                p.key.name !== "actions";
            })}
            
            this.traverse(path);
        }
    })
    
    return propList;
}

export class ComponentDefinition {
    name: string;
    filePath: string;
    props: any[];

    constructor(filePath: string, props: any[]) {
        this.filePath = filePath;
        let isPod = filePath.indexOf('pods') > 0;
        if (isPod) {
            this.name = filePath.split('pods/components/')[1].split('/component.js')[0]
        } else {
            let parts = filePath.split('/')
            this.name = path.basename(parts[parts.length - 1])
        }
        this.props = props;
        
    }
}


export function findComponentFiles(appRoot: string): Array<string> {
  let podComponents = getFiles(path.join(appRoot, 'components'), '.js');
  let nonPodComponents = getFiles(path.join(appRoot, 'pods/components'), '.js');
  
  return [].concat(podComponents, nonPodComponents);
}

export default function createComponentDefinitions(appRoot: string) {
    console.log("Processing component definitions..");
    let componentPaths = findComponentFiles(appRoot);
    
    let bar = new ProgressBar(':bar', {total: componentPaths.length})
    return componentPaths.map((p, i) => {
        let props = findProps(p)
        bar.tick();
        return new ComponentDefinition(p, props);
    })
}