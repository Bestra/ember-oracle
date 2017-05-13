import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import * as _ from 'lodash'
import { ModuleName } from "./types";

function singularize(str: string) {
    return str.slice(0, str.length - 1);
};

// yes it's an incredibly naive version of the ember resolver.
export default class Resolver {
    podPrefix = "pods";
    appRootName = "app";
    appName = "app" // this is renamed based on the app name in the ember project's cli config
    rootPath = ""; // set by the server
    fullAppPath() {
        return path.join(this.rootPath, this.appRootName);
    }

    fullPodPath() {
        return path.join(this.rootPath, this.appRootName, this.podPrefix);
    }
    /**
     * Translates a path like 'my-app/mixins/models/foo' to a real path in the file system.
     * For now this will won't pick up engine paths
     */
    filePathFromAppPath(inPath: string) {
        let parts = inPath.split('/')
        parts[0] = 'app';
        return path.join(this.rootPath, parts.join('/') + '.js');
    }
    moduleNameFromAppPath(inPath: string) {
        return this.moduleNameFromPath(this.filePathFromAppPath(inPath), this.rootPath);
    }

    createAbsolutePath(relativePath: string) {
        assert.notEqual(this.rootPath, '', "resolver.appRootPath must be set");
        return path.join(this.rootPath, relativePath);
    }
    // Note that all paths should be relative starting with appRootName
    moduleNameFromPath(absoluteFilePath: string, rootPath: string): ModuleName {
        // TODO: make sure app/ is removed too
        let relativePath = absoluteFilePath.split(rootPath)[1];

        let isPod = relativePath.match(/pods/)
        if (isPod) {
            return this.moduleFromPodPath(relativePath);
        } else {
            return this.moduleFromClassicPath(relativePath);
        }
    }

    moduleFromPodPath(relativePodPath: string): ModuleName {
        let modulePath;
        let prefix = path.basename(relativePodPath).split('.')[0]
        if (prefix === "component") {
            modulePath = path.dirname(relativePodPath.split('pods/components/')[1]);
        } else {
            modulePath = path.dirname(relativePodPath.split('pods/')[1]);
        }

        return prefix + ":" + modulePath as ModuleName;
    }

    //assuming segments like 'app/routes/foo/bar.js'
    moduleFromClassicPath(relativeClassicPath: string): ModuleName {
        let parts = _.reject(
            relativeClassicPath.split(/[\/\.]/),
            p => p === 'app' || p === ''
        );

        let [prefix, ...modulePath] = parts.slice(0, -1); // remove the file extension
        let lastIndex = modulePath.length - 1;
        modulePath[lastIndex] = modulePath[lastIndex].replace(/^-/, ''); // replace leading hyphen on partials

        return singularize(prefix) + ":" + modulePath.join('/') as ModuleName;
    }

    normalizePartialName(path: string) {
        return path;
    }

    associatedTemplate(moduleName: ModuleName): ModuleName | null {
        let [root, path] = moduleName.split(':');
        let newRoot = "template:"
        if (root === "controller") {
            return <ModuleName>(newRoot + path);
        } else if (root === "component") {
            return <ModuleName>(newRoot + "components/" + path);
        } else {
            return null;
        }
    }

    alternateModule(moduleName) {
        let [root, path] = moduleName.split(':');
        if (root === "template") {
            return this.templateContext(moduleName)
        } else {
            return this.associatedTemplate(moduleName)
        }
    }

    templateContext(templateModule: ModuleName): ModuleName {
        let [_root, path] = templateModule.split(':');
        let newRoot = path.match("components") ? "component:" : "controller:";
        return <ModuleName>(newRoot + path.replace("components/", ""));
    }

    componentTemplate(componentModule: string): ModuleName {
        return <ModuleName>`template:components/${componentModule}`;
    }
}