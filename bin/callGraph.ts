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
console.log('creating graph')
callGraph.init();
callGraph.createGraph();

let output = callGraph.createDotGraph('template:components/manuscript-new');
console.log('done')
fs.writeFileSync("./output.dot", output, { encoding: 'utf8' });