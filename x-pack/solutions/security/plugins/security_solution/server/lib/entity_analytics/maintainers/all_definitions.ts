/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// export * from './definitions/access_frequency';

import * as fs from 'fs';
import * as path from 'path';
import type { EntityMaintainer } from './maintainer';

const exportsMap: { [key: string]: EntityMaintainer } = {};
const currentDir = __dirname;

const excludedFiles = ['index.ts', 'index.js'];
fs.readdirSync(`${currentDir}/definitions`)
  .filter((file) => !excludedFiles.includes(file) && file.toLowerCase().endsWith('.ts'))
  .forEach((file) => {
    const fullPath = path.join(currentDir, 'definitions', file);
    // Dynamically require and assign exports (adjust based on your export style)
    // Note: 'require' may not have full TS support with dynamic paths.
    // For ES Modules with Node, you would use dynamic import()
    if (path.extname(file) === '.ts') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const module = require(fullPath) as EntityMaintainer;
      Object.assign(exportsMap, module);
    }
  });

// For CommonJS (if your tsconfig module is set to CommonJS)
module.exports = exportsMap;
