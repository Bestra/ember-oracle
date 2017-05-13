export type FilePath = string & {__filePathBrand: any }
export type AppPath = string & {__appPathBrand: any }
export type ModuleName = string & {__moduleNameBrand: any}

export interface ModuleDefinition {
    moduleName: string;
    filePath: string;
}
export interface Dict<T> {
    [index: string]: T
}
