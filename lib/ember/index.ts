import * as registry from '../util/registry'
import { findProps } from './emberClass'

export function propertyLocation(moduleName, propName) {
    let emberModule = registry.lookup(moduleName);
    let foundProps = findProps(emberModule.filePath);
    return  foundProps[propName];  
}