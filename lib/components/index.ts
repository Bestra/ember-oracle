import { getFiles } from '../util/files'
import * as path from 'path'
import * as recast from 'recast'
import * as fs from 'fs'
import * as ProgressBar from 'progress'
let babel = require('babel-core');
import * as AST from './ast'

interface Property {
    name: string;
    line: number;
    column: number;
}

interface ComputedProperty extends Property {
    dependentKeys: string[];
}

interface ServiceProperty extends Property {
    serviceName: string;
}

export function findProps(jsPath: string): Property[] {
    let src = fs.readFileSync(jsPath, 'utf8');   
    let ast = recast.parse(src, {esprima: babel});
    let propList: Property[] = [];
    recast.visit(ast, {
        visitExportDefaultDeclaration: function(path) {
            let node = path.node;
            let args = node.declaration.arguments;
            if (args && args.length) {
            let directProps: AST.Property[] = args[args.length - 1].properties;
            propList = directProps.filter((p) =>  {
                return p.value.type !== "FunctionExpression" &&
                p.key.name !== "actions";
            }).map((k) => {
                return {name: k.key.name, line: k.loc.start.line, column: k.loc.start.column}
            })
        }
            
            this.traverse(path);
        }
    })
    
    return propList;
}

export class EmberClassDefinition {
    name: string;
    filePath: string;
    props: Property[];

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
  let podComponents = getFiles(path.join(appRoot, 'components'), ['.js']);
  let nonPodComponents = getFiles(path.join(appRoot, 'pods/components'), ['.js']);
  
  return [].concat(podComponents, nonPodComponents);
}

export default function createComponentDefinitions(appRoot: string) {
    console.log("Processing component definitions..");
    let componentPaths = findComponentFiles(appRoot);
    
    let bar = new ProgressBar(':current/:total :filename', {total: componentPaths.length})
    return componentPaths.map((p, i) => {
        let props: Property[] = findProps(p)
        bar.tick({
            'filename': p
        });
        return new EmberClassDefinition(p, props);
    })
}