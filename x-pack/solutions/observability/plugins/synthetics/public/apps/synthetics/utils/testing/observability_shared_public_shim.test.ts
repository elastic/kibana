/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import * as shim from './observability_shared_public_shim';

const PUBLIC_DIR = join(__dirname, '../../../..');
const ENTRY_POINT = '@kbn/observability-shared-plugin/public';

const getSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return getSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });

const getImportedValues = (source: string) =>
  [...source.matchAll(new RegExp(`import\\s+\\{([^}]*)\\}\\s+from\\s+'${ENTRY_POINT}';`, 'g'))]
    .flatMap(([, names]) => names.split(','))
    .map((name) => name.trim())
    .filter((name) => name && !name.startsWith('type '))
    .map((name) => name.split(' as ')[0].trim());

describe('observability shared public jest shim', () => {
  it('exports every value synthetics imports from the real entry point', () => {
    const imported = new Set(
      getSourceFiles(PUBLIC_DIR).flatMap((file) =>
        file.endsWith('_shim.test.ts') ? [] : getImportedValues(readFileSync(file, 'utf8'))
      )
    );

    const missing = [...imported].filter((name) => !(name in shim));

    expect(imported.size).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
