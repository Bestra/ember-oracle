declare module 'recast' {
    export function parse(source: string): any;
    export function visit(ast: any, stuff: any): void;
}