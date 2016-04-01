
declare module 'jscodeshift/dist/Runner' {
    export function run(transformFile: string, paths: string[], options): Promise<any>;
}