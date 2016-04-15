import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'

export interface Template {
    filePath;
    source;
}

export interface BoundPath {
    type: string;
    name: string;
    sourceModule: string;
};

export interface BlockParam {
    type: string;
    name: string;
    sourceModule: string;
    isYielded: boolean;
    blockNode: htmlBars.BlockStatement;
    index;
};

export type PathSource = BoundPath | BlockParam;