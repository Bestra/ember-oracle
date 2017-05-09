export type FilePath = string & {__filePathBrand: any }
export type AppPath = string & {__appPathBrand: any }

export interface Dict<T> {
    [index: string]: T
}
