/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mapping coverage guard for index_templates.ts.
 *
 * When you add a new field to the threatReportsTemplate mapping:
 * 1. Add the field to `threatReportsTemplate` in index_templates.ts.
 * 2. Bump TEMPLATE_VERSION and document the bump in the JSDoc block.
 * 3. Add a migrateExisting* function and wire it into installIndexTemplates.
 * 4. Update the assertions here.
 */

import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.join(__dirname, 'index_templates.ts'), 'utf8');

describe('index_templates — mapping coverage guard', () => {
  it('TEMPLATE_VERSION is 18', () => {
    expect(src).toContain('const TEMPLATE_VERSION = 18;');
  });

  it('content.external_references is declared as nested with the expected property shape', () => {
    expect(src).toContain('external_references: {');
    expect(src).toContain("type: 'nested' as const,");
    expect(src).toContain("source_name: { type: 'keyword' as const }");
    expect(src).toContain("url: { type: 'keyword' as const }");
    expect(src).toContain("external_id: { type: 'keyword' as const }");
    expect(src).toContain("description: { type: 'text' as const, index: false as const }");
  });

  it('migrateExistingExternalReferencesMapping is wired into installIndexTemplates', () => {
    expect(src).toContain('const migrateExistingExternalReferencesMapping');

    const installIdx = src.indexOf('export const installIndexTemplates');
    expect(installIdx).toBeGreaterThan(-1);

    const callIdx = src.indexOf('await migrateExistingExternalReferencesMapping', installIdx);
    expect(callIdx).toBeGreaterThan(installIdx);
  });
});
