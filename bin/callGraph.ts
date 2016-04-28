import * as registry from '../lib/util/registry'
import createModules from '../lib/server/startApp'
import * as callGraph from '../lib/util/callGraph'
import * as _ from 'lodash'
import * as fs from 'fs'
import { Template } from '../lib/hbs'
let args = process.argv.slice(2);
let dir = args[0];
let engines = args.slice(1) || [];

createModules(dir, engines);
let {nodes, edges} = callGraph.createGraph();
console.log(`found ${_.keys(nodes).length} nodes and ${edges.length} edges`);
// let edges = []
// _.forEach(callGraph.invocationsByTemplate, (components, templateName) => {

//     _.forEach(components, c => edges.push(`"${templateName}" -> "${c.templateModule}"`))

// })
// let uniqueEdges = _.uniq(edges);

// let output = ["digraph {", ...uniqueEdges, "}"].join('\n');
// fs.writeFileSync("./output.dot", output, { encoding: 'utf8' });