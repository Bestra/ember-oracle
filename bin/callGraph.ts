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
let graphEdges = []
console.log(`found ${_.keys(nodes).length} nodes and ${edges.length} edges`);

_.forEach(edges, (edge) => {
    console.log(
    _.get(edge, 'from.template.moduleName'), ' | ', _.get(edge, 'from.context.moduleName')
    , ' -> ',
    _.get(edge, 'to.template.moduleName'), ' | ', _.get(edge, 'to.context.moduleName'))
    if (_.get(edge, 'to.template.moduleName') && _.get(edge, 'from.template.moduleName')) {
        let label = `[ label ="${Object.keys(edge.props).join(',')}" ]`;
        graphEdges.push(`"${edge.from.template.moduleName}" -> "${edge.to.template.moduleName}" ${label};`)
    }

})
console.log("createed ", graphEdges.length, "edges")

let output = ["digraph {", ...graphEdges, "}"].join('\n');
fs.writeFileSync("./output.dot", output, { encoding: 'utf8' });