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
  it('TEMPLATE_VERSION is 20', () => {
    expect(src).toContain('const TEMPLATE_VERSION = 20;');
  });

  it('content.external_references is declared as nested with the expected property shape', () => {
    expect(src).toContain('external_references: {');
    expect(src).toContain("type: 'nested' as const,");
    expect(src).toContain("source_name: { type: 'keyword' as const }");
    expect(src).toContain("url: { type: 'keyword' as const }");
    expect(src).toContain("canonical_url: { type: 'keyword' as const }");
    expect(src).toContain("external_id: { type: 'keyword' as const }");
    expect(src).toContain("description: { type: 'text' as const, index: false as const }");
    expect(src).toContain("ref_part: { type: 'integer' as const }");
    expect(src).toContain("ref_part_count: { type: 'integer' as const }");
  });

  it('migrateExistingExternalReferencesMapping is wired into installIndexTemplates', () => {
    expect(src).toContain('const migrateExistingExternalReferencesMapping');

    const installIdx = src.indexOf('export const installIndexTemplates');
    expect(installIdx).toBeGreaterThan(-1);

    const callIdx = src.indexOf('await migrateExistingExternalReferencesMapping', installIdx);
    expect(callIdx).toBeGreaterThan(installIdx);
  });

  it('extracted.iocs includes reference and block_index fields (v19 maltrail adapter fields)', () => {
    expect(src).toContain("reference: { type: 'keyword' as const }");
    expect(src).toContain("block_index: { type: 'integer' as const }");
  });

  it('extracted.vulnerability block is declared with all expected keyword/date properties (v20)', () => {
    expect(src).toContain('vulnerability: {');
    expect(src).toContain("cve_id: { type: 'keyword' as const }");
    expect(src).toContain("vendor: { type: 'keyword' as const }");
    expect(src).toContain("product: { type: 'keyword' as const }");
    expect(src).toContain("date_added: { type: 'date' as const }");
    expect(src).toContain("due_date: { type: 'date' as const }");
    expect(src).toContain("ransomware_use: { type: 'keyword' as const }");
  });

  it('migrateExistingVulnerabilityMappings is wired into installIndexTemplates', () => {
    expect(src).toContain('const migrateExistingVulnerabilityMappings');

    const installIdx = src.indexOf('export const installIndexTemplates');
    expect(installIdx).toBeGreaterThan(-1);

    const callIdx = src.indexOf('await migrateExistingVulnerabilityMappings', installIdx);
    expect(callIdx).toBeGreaterThan(installIdx);
  });
});
