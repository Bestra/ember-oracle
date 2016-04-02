declare module 'recast' {
    export function parse(source: string, options: any): any;
    export function visit(ast: any, stuff: any): void;
}