import * as registry from '../lib/util/registry'
import createModules from '../lib/server/startApp'
import * as _ from 'lodash'
import * as fs from 'fs'
let args = process.argv.slice(2);
let dir = args[0];
let engines = args.slice(1) || [];

createModules(dir, engines);
let componentCalls = {};

_.forEach(registry.allModules('template'), (val, key) => {
    componentCalls[val.definition.moduleName] = {
        componentInvocations: val.definition.components,
        context: val.definition.context.definition       
});

console.log("processed", _.keys(componentCalls).length, "templates")

let edges = []
_.forEach(componentCalls, (components, templateName) => {

    _.forEach(components, c => edges.push(`"${templateName}" -> "${c.templateModule}"`))

})
let uniqueEdges = _.uniq(edges);

let output = ["digraph {", ...uniqueEdges, "}"].join('\n');
fs.writeFileSync("./output.dot", output, { encoding: 'utf8' });