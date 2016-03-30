 declare function walkSync(baseDir: string, _options?): Array<string>;

declare module "walk-sync" {
  export = walkSync;
}