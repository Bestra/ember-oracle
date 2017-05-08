export type FilePath = string & {__filePathBrand: any }
export type ModuleName = string & {__moduleNameBrand: any }


let k = <FilePath>"foo";

let r = (m: ModuleName): FilePath => {
    let s = m as string;
    return <FilePath>s;
}
