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
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  THREAT_INTEL_INDICATORS_INDEX,
  THREAT_INTEL_SOURCES_INDEX,
  THREAT_REPORTS_INDEX,
} from '../../../common/threat_intel';
import { installIndexTemplates } from './index_templates';

const src = fs.readFileSync(path.join(__dirname, 'index_templates.ts'), 'utf8');

interface PutTemplateArg {
  name: string;
  template?: { settings?: Record<string, unknown>; mappings?: Record<string, unknown> };
}

/** Runs the real installer against a mocked cluster and returns what it sent. */
const runInstall = async () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.exists.mockResolvedValue(false);
  esClient.indices.get.mockResolvedValue({});
  esClient.indices.getSettings.mockResolvedValue({});

  await installIndexTemplates({ esClient, logger: loggingSystemMock.createLogger() });

  const templates = esClient.indices.putIndexTemplate.mock.calls.map(
    ([arg]) => arg as PutTemplateArg
  );
  const byIndex = (index: string) => templates.find((t) => t.name === `${index}-template`);
  return { esClient, templates, byIndex };
};

describe('installIndexTemplates', () => {
  it('marks all three threat intel indices hidden', async () => {
    const { byIndex } = await runInstall();

    for (const index of [
      THREAT_REPORTS_INDEX,
      THREAT_INTEL_SOURCES_INDEX,
      THREAT_INTEL_INDICATORS_INDEX,
    ]) {
      expect(byIndex(index)?.template?.settings).toEqual(
        expect.objectContaining({ 'index.hidden': true })
      );
    }
  });

  it('maps a field for every IOC type the promote task can emit', async () => {
    const { byIndex } = await runInstall();

    const indicator = (
      byIndex(THREAT_INTEL_INDICATORS_INDEX)?.template?.mappings as {
        properties: {
          threat: { properties: { indicator: { properties: Record<string, unknown> } } };
        };
      }
    ).properties.threat.properties.indicator.properties;

    // `dynamic: 'strict'` rejects the whole document for any unmapped path, and
    // the promote task only warns, so a gap here silently drops indicators.
    expect(indicator).toEqual(
      expect.objectContaining({
        ip: expect.anything(),
        url: expect.anything(),
        file: expect.anything(),
        email: expect.anything(),
        network: expect.anything(),
        cryptocurrency: expect.anything(),
      })
    );
  });

  it('marks pre-existing indices hidden, since templates only apply at creation', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.exists.mockResolvedValue(false);
    esClient.indices.get.mockResolvedValue({ '.kibana-threat-reports': {} });
    esClient.indices.getSettings.mockResolvedValue({});

    await installIndexTemplates({ esClient, logger: loggingSystemMock.createLogger() });

    const hidden = esClient.indices.putSettings.mock.calls.map(([arg]) => arg.index);
    expect(hidden).toEqual(
      expect.arrayContaining([
        '.kibana-threat-reports',
        THREAT_INTEL_SOURCES_INDEX,
        THREAT_INTEL_INDICATORS_INDEX,
      ])
    );
  });

  it('leaves an already-hidden index alone', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.exists.mockResolvedValue(false);
    esClient.indices.get.mockResolvedValue({});
    esClient.indices.getSettings.mockResolvedValue({
      [THREAT_INTEL_SOURCES_INDEX]: { settings: { index: { hidden: 'true' } } },
    });

    await installIndexTemplates({ esClient, logger: loggingSystemMock.createLogger() });

    const hidden = esClient.indices.putSettings.mock.calls.map(([arg]) => arg.index);
    expect(hidden).not.toContain(THREAT_INTEL_SOURCES_INDEX);
  });
});

describe('index_templates — mapping coverage guard', () => {
  it('threat reports template does not declare a data stream', () => {
    const reportsTemplateStart = src.indexOf('const threatReportsTemplate');
    const reportsTemplateEnd = src.indexOf('const COMPANION_INDEX_TEMPLATES');
    const reportsTemplate = src.slice(reportsTemplateStart, reportsTemplateEnd);
    expect(reportsTemplate).not.toContain('data_stream:');
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
