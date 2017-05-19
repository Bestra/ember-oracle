import Registry from '../lib/util/registry'
import Resolver from '../lib/util/resolver'
import Application from '../lib/server/app'
import { RenderGraph } from '../lib/util/renderGraph'
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
let renderGraph = new RenderGraph(reg);
renderGraph.init();

let output = renderGraph.createDotGraph('template:components/manuscript-new');
console.log('done')
fs.writeFileSync("./output.dot", output, { encoding: 'utf8' });