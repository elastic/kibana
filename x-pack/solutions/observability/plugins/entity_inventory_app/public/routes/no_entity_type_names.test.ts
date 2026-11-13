/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

const PUBLIC_DIR = join(__dirname, '..');

// `routes/config.tsx` holds the page-to-type map until entity definitions carry a category.
// `mock_inventory_api/` is the filters' stand-in for the routes until the filters read the routes.
const ALLOWED_FILES: readonly string[] = ['routes/config.tsx'];
const ALLOWED_DIRECTORIES: readonly string[] = ['mock_inventory_api', '__fixtures__'];
const TEST_ONLY_FILE = /(\.test\.tsx?$)|(^mocks\.tsx$)/;
const TYPE_NAME_LITERAL = /(['"`])(host|k8s\.deployment)\1/;
// A relative import of a `__fixtures__/` module or of the plugin's `mocks` module.
const TEST_ONLY_IMPORT = /from '(?:\.\.?\/)+(?:[^']*\/)?(?:__fixtures__\/[^']*|mocks)'/;

const listProductionFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return ALLOWED_DIRECTORIES.includes(entry.name) ? [] : listProductionFiles(path);
    }
    const isSource = /\.tsx?$/.test(entry.name);
    return isSource && !TEST_ONLY_FILE.test(entry.name) ? [relative(PUBLIC_DIR, path)] : [];
  });

describe('entity type names in the app', () => {
  it('are named only by the page-to-type map', () => {
    const filesNamingAType = listProductionFiles(PUBLIC_DIR).filter(
      (file) =>
        !ALLOWED_FILES.includes(file) &&
        TYPE_NAME_LITERAL.test(readFileSync(join(PUBLIC_DIR, file), 'utf8'))
    );

    expect(filesNamingAType).toEqual([]);
  });

  it('finds the page-to-type map, so the scan reads the sources', () => {
    expect(listProductionFiles(PUBLIC_DIR)).toContain('routes/config.tsx');
    expect(
      TYPE_NAME_LITERAL.test(readFileSync(join(PUBLIC_DIR, 'routes/config.tsx'), 'utf8'))
    ).toBe(true);
  });
});

const listNonTestFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__fixtures__' ? [] : listNonTestFiles(path);
    }
    const isSource = /\.tsx?$/.test(entry.name);
    return isSource && !TEST_ONLY_FILE.test(entry.name) ? [relative(PUBLIC_DIR, path)] : [];
  });

describe('test-only modules in the app', () => {
  it('are not imported by production code', () => {
    const filesImportingTestOnlyCode = listNonTestFiles(PUBLIC_DIR).filter((file) =>
      TEST_ONLY_IMPORT.test(readFileSync(join(PUBLIC_DIR, file), 'utf8'))
    );

    expect(filesImportingTestOnlyCode).toEqual([]);
  });

  it('recognizes an import of a fixture or of the mocks, so the scan can fail', () => {
    expect(TEST_ONLY_IMPORT.test(`from '../../../__fixtures__/inventory_client';`)).toBe(true);
    expect(TEST_ONLY_IMPORT.test(`from '../../mocks';`)).toBe(true);
    expect(TEST_ONLY_IMPORT.test(`from './mocks';`)).toBe(true);
    expect(TEST_ONLY_IMPORT.test(`from '@kbn/core/public/mocks';`)).toBe(false);
    expect(listNonTestFiles(PUBLIC_DIR)).toContain('mock_inventory_api/get_types.ts');
  });
});
