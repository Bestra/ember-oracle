import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'

export interface Template {
    filePath;
    source;
}

export interface BoundPath {
    type: string;
    name;
    sourceModule;
};
export interface BlockParam {
    type: string;
    name;
    sourceModule;
    isYielded: boolean;
    blockNode: htmlBars.BlockStatement;
    index;
};

export type PathSource = BoundPath | BlockParam;