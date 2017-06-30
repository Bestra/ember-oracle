export type FilePath = string & { __filePathBrand: any };
export type AppPath = string & { __appPathBrand: any };
export type ModuleName = string & { __moduleNameBrand: any };

export interface ModuleDefinition {
  moduleName: ModuleName;
  filePath: FilePath;
}
export interface Dict<T> {
  [index: string]: T;
}

export type PropertyGraphNodeType =
  | 'boundProperty'
  | 'propertyGet'
  | 'propertySet'
  | 'propertyInvocation'
  | 'prototypeProperty'
  | 'blockParam';

export interface PropertyGraphNode {
  propertyGraphKey: string;
  dotGraphKey: string;
  name: string;
  nodeType: PropertyGraphNodeType;
  nodeModuleName: ModuleName;
}
