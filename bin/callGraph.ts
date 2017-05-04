import Registry from '../lib/util/registry'
import Resolver from '../lib/util/resolver'
import Application from '../lib/server/startApp'
import { CallGraph } from '../lib/util/callGraph'
import * as _ from 'lodash'
import * as fs from 'fs'
import { Template } from '../lib/hbs'
let args = process.argv.slice(2);
let dir = args[0];
let engines = args.slice(1) || [];
let res = new Resolver();
let reg = new Registry(res);
new Application(res, reg).init(dir, engines);
console.log('creating graph')
let callGraph = new CallGraph(res, reg);
callGraph.init();
callGraph.createGraph();

let output = callGraph.createDotGraph('template:components/manuscript-new');
console.log('done')
fs.writeFileSync("./output.dot", output, { encoding: 'utf8' });