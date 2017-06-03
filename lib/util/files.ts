'use strict';
import * as path from 'path';
import * as fs from 'fs';
import walkSync = require('walk-sync');
import * as resolver from './resolver';
import { FilePath } from './types';

export function getFiles(rootDir: string, extensions: string[]): FilePath[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  return walkSync(rootDir)
    .filter(file => {
      return extensions.indexOf(path.extname(file)) > -1;
    })
    .map(file => {
      return <FilePath>path.join(rootDir, file);
    });
}

export function getAppFile(appPath: string) {}
