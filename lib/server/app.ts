import * as path from 'path';
import * as fs from 'fs';
import { RenderGraph } from '../util/renderGraph'
import * as childProcess from 'child_process';
import Resolver from '../util/resolver'
import Registry from '../util/registry'
import { ok } from 'assert'
import { Template } from '../hbs';
import PropertyGraph from "../util/propertyGraph";

class StringWrapper {
    string: string;

    constructor(s: string) {
        this.string = s;
    }
}

class ConfigFile {
    addonPaths;
    constructor(rootPath: string) {
        let dotFilePath = path.join(rootPath, ".ember-oracle");
        this.addonPaths = [];
        console.log(`looking for config file at ${dotFilePath}`);
        if (fs.existsSync(dotFilePath)) {
            let dotInfo = JSON.parse(fs.readFileSync(dotFilePath, 'utf8'))
            console.log("addon paths found in config file:");
            console.log(dotInfo.addonPaths);
            this.addonPaths = dotInfo.addonPaths.map(p => {
                return path.resolve(dotFilePath, p);
            });
        }
    }
}

export default class Application {
    resolver: Resolver;
    registry: Registry;
    renderGraph: RenderGraph;
    propertyGraph: PropertyGraph;

    constructor(resolver: Resolver, registry: Registry) {
        this.resolver = resolver;
        this.registry = registry;
        this.renderGraph =  new RenderGraph(this.registry);
        this.propertyGraph = new PropertyGraph(this.registry, this.renderGraph);
    }

    init(aPath: string, enginePaths: string[] = []) {
                let t1 = Date.now();

        let rootPath = path.resolve(aPath);
        console.log("Running ember-oracle on ", rootPath);
        this.resolver.rootPath = rootPath;
        this.registry.registerModules(rootPath, "pods");
        new ConfigFile(rootPath).addonPaths.forEach(p => {
            console.log("registering modules in ", p)
            this.registry.registerModules(p, "pods")
        });
        enginePaths.forEach(p => {

            this.registry.registerModules(p, "pods");
        });
        let t2 = Date.now();

        this.renderGraph.init();
        let t3 = Date.now();
        this.propertyGraph.init();
        let t4 = Date.now();

        console.log("init in ", t2 - t1);
        console.log("renderGraph in ", t3 - t2);
        console.log("propertyGraph in ", t4 - t3);

        global["App"] = this;

    }

    moduleNames(type) {
        return this.registry.moduleNames(type)
    }

    modulePath(moduleName) {
        return this.registry.lookup(moduleName).definition.filePath;
    }

    definitionForSymbolInTemplate(filePath, line, column, attr) {
        let fullPath = path.resolve(filePath);
        let template = this.registry.lookup(this.registry.lookupModuleName(fullPath)).definition as Template;

        let queryPosition = { line: parseInt(line), column: parseInt(column) };
        let defineable = template.parsePosition(queryPosition);
        let position = defineable.definedAt;
        let invokedAttrs = this.renderGraph.invocations(
            this.resolver.templateContext(template.moduleName),
            attr
        ).filter((a) => { return !a.match(/not provided/) });
        return {position, invokedAttrs}
    }
    
    findContextModule(filePath: string) {
        let m = this.registry.lookupModuleName(filePath);
        let contextModule = this.resolver.templateContext(m);
        return this.registry.lookup(contextModule) ? contextModule : m;
    }
    invokedAttrs(templateFilePath: string, attrName: string) {
        let m = this.findContextModule(templateFilePath);
        console.log("looking up parents for ", m)
        return this.renderGraph.invocations(m, attrName);
    }

    findParents(templateFilePath: string) {
        let m = this.registry.lookupModuleName(templateFilePath);
        console.log("looking up parent templates for ", m)
        let results = this.renderGraph.invocationSites(m);
        console.log("found ", results.length);
        return this.renderGraph.invocationSites(m);
    }

    alternateFile(filePath) {
        let fullPath = path.resolve(filePath);
        let moduleName = this.registry.lookupModuleName(fullPath);
        console.log("looking up alternate for module ", moduleName)

        let associated = this.resolver.alternateModule(moduleName);
        if (associated) {
            return this.registry.lookup(associated).filePath;
        } else {
            return null;
        }
    }

    renderDotGraph(query) {
        let templateModule;
        if (query.path) {
            let fullPath = path.resolve(query.path);
            templateModule = this.registry.lookupModuleName(fullPath);
        } else if (query.module) {
            templateModule = query.module;
        } else {
            templateModule = null;
        }
        let collapse = query.collapse || false;
        return this.renderGraph.createDotGraph(templateModule, true, collapse);
    }

    renderSvgGraph(query) {
        let dot = this.renderDotGraph(query);
        console.log(dot);
        return childProcess.execSync('dot -Tsvg', { input: dot });
    }

    propertySvgGraph(query) {
        let dot = this.propertyGraph.createDotGraph()
        return childProcess.execSync('dot -Tsvg', { input: dot });
    }
}

