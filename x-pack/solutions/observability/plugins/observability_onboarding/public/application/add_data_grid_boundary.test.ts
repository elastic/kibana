/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'fs';
import { join, relative, resolve } from 'path';

/**
 * `add_data_grid/` mirrors the `src/` of a future shared package: production
 * code may import only react, EUI, emotion and i18n, tests add the testing
 * libraries, and hosts may reach it only through `index.ts`. This test lives
 * outside the directory because it needs `fs`/`path`, which the rule forbids.
 *
 * Everything a host varies arrives through props, including rendered icon
 * nodes, resolved `href`/`onClick`, translated content strings, pre-filtered
 * result items and a card renderer. Which tiles exist, where they navigate and
 * where items come from stay in `add_data_page/`. Widening the allowlist below
 * is a decision about what the future package may depend on, so the lift stays
 * a directory move plus a manifest, a tsconfig, and renaming the
 * `xpack.observability_onboarding.addDataGrid.*` i18n prefix.
 */
const GRID_ROOT = resolve(__dirname, 'add_data_grid');

const ALLOWED_IN_SOURCE = [
  'react',
  '@elastic/eui',
  '@emotion/react',
  '@kbn/i18n',
  '@kbn/i18n-react',
];

const ALLOWED_IN_TESTS_ONLY = [
  '@emotion/jest',
  '@kbn/test-jest-helpers',
  '@testing-library/react',
  '@testing-library/user-event',
];

// import x from 'y' / export { x } from 'y' / import 'y' / require('y') /
// import('y') / jest.mock('y'). Anything that pulls in another module.
const SPECIFIER_PATTERN = /(?:from\s*|import\s*\(\s*|require\s*\(\s*|jest\.mock\(\s*)'([^']+)'/g;

const collectFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(entryPath);
    }
    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  });

const collectSpecifiers = (filePath: string): string[] => {
  const contents = readFileSync(filePath, 'utf8');
  return Array.from(contents.matchAll(SPECIFIER_PATTERN), ([, specifier]) => specifier);
};

const isRelative = (specifier: string) => specifier.startsWith('.');

const staysInsideGrid = (filePath: string, specifier: string) => {
  const target = resolve(filePath, '..', specifier);
  return target === GRID_ROOT || target.startsWith(`${GRID_ROOT}/`);
};

const gridFiles = collectFiles(GRID_ROOT);

const PUBLIC_ROOT = resolve(__dirname, '..');

const hostFiles = collectFiles(PUBLIC_ROOT).filter((filePath) => !filePath.startsWith(GRID_ROOT));

describe('add_data_grid import boundary', () => {
  it('finds the directory it is meant to guard', () => {
    // A rename or a move would otherwise turn every assertion below into a
    // vacuous pass over an empty file list.
    expect(gridFiles.length).toBeGreaterThan(10);
  });

  it.each(gridFiles.map((filePath) => [relative(GRID_ROOT, filePath), filePath]))(
    '%s imports nothing outside the allowlist',
    (_label, filePath) => {
      const isTest = /\.test\.tsx?$/.test(filePath);
      const allowed = isTest ? [...ALLOWED_IN_SOURCE, ...ALLOWED_IN_TESTS_ONLY] : ALLOWED_IN_SOURCE;

      const violations = collectSpecifiers(filePath).filter(
        (specifier) => !isRelative(specifier) && !allowed.includes(specifier)
      );

      expect(violations).toEqual([]);
    }
  );

  it.each(gridFiles.map((filePath) => [relative(GRID_ROOT, filePath), filePath]))(
    '%s keeps its relative imports inside add_data_grid',
    (_label, filePath) => {
      const escapes = collectSpecifiers(filePath)
        .filter(isRelative)
        .filter((specifier) => !staysInsideGrid(filePath, specifier));

      expect(escapes).toEqual([]);
    }
  );

  it('is only reached through its public entry point', () => {
    // A deep import works today and breaks the moment this becomes a package,
    // because packages expose one entry point and no subpaths.
    const deepImports = hostFiles.flatMap((filePath) =>
      collectSpecifiers(filePath)
        .filter(isRelative)
        .filter((specifier) => resolve(filePath, '..', specifier).startsWith(`${GRID_ROOT}/`))
        .map((specifier) => `${relative(PUBLIC_ROOT, filePath)} -> ${specifier}`)
    );

    expect(deepImports).toEqual([]);
  });
});
