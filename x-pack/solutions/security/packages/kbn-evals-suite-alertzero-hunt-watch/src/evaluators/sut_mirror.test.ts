/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const PACKAGE_ROOT = join(__dirname, '..', '..');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === 'target') return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

describe('sut_mirror guard', () => {
  it('is imported only by *.test.ts files: production reads `completeness` off the wire and never re-derives it', () => {
    const importers = walk(PACKAGE_ROOT)
      .filter(
        (f) =>
          f.endsWith('.ts') && !f.endsWith('sut_mirror.ts') && !f.endsWith('sut_mirror.test.ts')
      )
      .filter((f) => /from '[^']*sut_mirror'/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(PACKAGE_ROOT, f));
    expect(importers.length).toBeGreaterThan(0); // the scan is not vacuous
    expect(importers.filter((f) => !f.endsWith('.test.ts'))).toEqual([]);
  });
});
