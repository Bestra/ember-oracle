
   export interface Loc {
        line: number;
        column: number;
    }

   export interface Node {
        type: string;
        start: number;
        end: number;
        loc: {
            start: Loc;
            end: Loc;
        }
    }

    export interface Property extends Node {
        key: { name: "string" };
        value: { type: "string" };
    }