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

const REPORT_INDEX = '.kibana-threat-reports';

/** Mapping shape for a reports index that is already on the current version. */
const fullyMigratedReportMappings = () => ({
  properties: {
    content: {
      properties: {
        external_references: {
          properties: {
            source_name: {},
            url: {},
            canonical_url: {},
            external_id: {},
            description: {},
            ref_part: {},
            ref_part_count: {},
          },
        },
      },
    },
    lineage: { properties: { content_scrubbed_at: {} } },
    extracted: {
      properties: {
        diamond: {},
        gate: {},
        vulnerability: {},
        iocs: {
          properties: {
            tier: {},
            tier_heuristic: {},
            tier_basis: {},
            port: {},
            reference: {},
            block_index: {},
          },
        },
      },
    },
  },
});

/** Indicators mapping that is already on the current version. */
const fullyMigratedIndicatorMappings = () => ({
  properties: {
    space_id: {},
    ioc_tier: {},
    sources: {},
    threat: {
      properties: {
        indicator: { properties: { email: {}, network: {}, cryptocurrency: {} } },
      },
    },
  },
});

/**
 * Runs the real installer against a cluster that already has a reports index,
 * so the migration paths actually execute (the suite above mocks `indices.get`
 * to `{}`, which makes every report migration a no-op).
 */
const runMigrations = async ({
  reportMappings = fullyMigratedReportMappings(),
  indicatorMappings = fullyMigratedIndicatorMappings(),
}: {
  reportMappings?: Record<string, unknown>;
  indicatorMappings?: Record<string, unknown>;
} = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.exists.mockResolvedValue(true);
  esClient.indices.get.mockResolvedValue({ [REPORT_INDEX]: {} });
  esClient.indices.getSettings.mockResolvedValue({
    [REPORT_INDEX]: { settings: { index: { hidden: 'true' } } },
    [THREAT_INTEL_SOURCES_INDEX]: { settings: { index: { hidden: 'true' } } },
    [THREAT_INTEL_INDICATORS_INDEX]: { settings: { index: { hidden: 'true' } } },
  });
  esClient.indices.getMapping.mockImplementation((async (args: { index: string }) => ({
    [args.index]: {
      mappings: args.index === THREAT_INTEL_INDICATORS_INDEX ? indicatorMappings : reportMappings,
    },
  })) as never);

  await installIndexTemplates({ esClient, logger: loggingSystemMock.createLogger() });

  const putMappingArgs = esClient.indices.putMapping.mock.calls.map(([arg]) => arg);
  /** Every property path touched by a putMapping call, as dotted strings. */
  const patchedPaths = putMappingArgs.flatMap((arg) => {
    const paths: string[] = [];
    const walk = (node: Record<string, unknown>, prefix: string) => {
      for (const [key, value] of Object.entries(node)) {
        const propertyPath = prefix ? `${prefix}.${key}` : key;
        const nested = (value as { properties?: Record<string, unknown> })?.properties;
        if (nested) {
          walk(nested, propertyPath);
        } else {
          paths.push(propertyPath);
        }
      }
    };
    walk((arg.properties ?? {}) as Record<string, unknown>, '');
    return paths;
  });

  return { esClient, putMappingArgs, patchedPaths };
};

describe('index_templates — migrations', () => {
  it('resolves the report index list once for all report migrations', async () => {
    const { esClient } = await runMigrations();
    // Previously each of the report-targeting migrations issued its own
    // identical indices.get against the wildcard pattern.
    expect(esClient.indices.get).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when every mapping is already current', async () => {
    const { putMappingArgs } = await runMigrations();
    expect(putMappingArgs).toEqual([]);
  });

  it.each([
    ['extracted.diamond', 'diamond'],
    ['extracted.gate', 'gate'],
    ['extracted.vulnerability', 'vulnerability'],
  ])('adds %s when absent', async (expectedPath, field) => {
    const mappings = fullyMigratedReportMappings();
    delete (mappings.properties.extracted.properties as Record<string, unknown>)[field];

    const { patchedPaths } = await runMigrations({ reportMappings: mappings });

    expect(patchedPaths.some((p) => p.startsWith(expectedPath))).toBe(true);
  });

  it.each([
    ['tier', 'extracted.iocs.tier'],
    ['port', 'extracted.iocs.port'],
    ['reference', 'extracted.iocs.reference'],
  ])('adds extracted.iocs.%s when absent', async (field, expectedPath) => {
    const mappings = fullyMigratedReportMappings();
    delete (mappings.properties.extracted.properties.iocs.properties as Record<string, unknown>)[
      field
    ];

    const { patchedPaths } = await runMigrations({ reportMappings: mappings });

    expect(patchedPaths).toContain(expectedPath);
  });

  it('adds lineage.content_scrubbed_at when absent', async () => {
    const mappings = fullyMigratedReportMappings();
    delete (mappings.properties.lineage.properties as Record<string, unknown>).content_scrubbed_at;

    const { patchedPaths } = await runMigrations({ reportMappings: mappings });

    expect(patchedPaths).toContain('lineage.content_scrubbed_at');
  });

  it('adds space_id to the indicators index when absent', async () => {
    const indicatorMappings = fullyMigratedIndicatorMappings();
    delete (indicatorMappings.properties as Record<string, unknown>).space_id;

    const { patchedPaths } = await runMigrations({ indicatorMappings });

    expect(patchedPaths).toContain('space_id');
  });

  // The four external_references states the reviewer called out. State 2 must
  // install the complete current property set: because the branches are
  // exclusive, a partial install would leave ref_part missing until a second
  // boot, and strict mapping rejects chunked docs in the meantime.
  describe('content.external_references', () => {
    const withExternalRefs = (props: Record<string, unknown> | undefined) => {
      const mappings = fullyMigratedReportMappings();
      if (props === undefined) {
        delete (mappings.properties.content.properties as Record<string, unknown>)
          .external_references;
      } else {
        mappings.properties.content.properties.external_references = {
          properties: props,
        } as never;
      }
      return mappings;
    };

    it('installs the full property set on a pre-v18 index (no external_references)', async () => {
      const { patchedPaths } = await runMigrations({ reportMappings: withExternalRefs(undefined) });

      for (const field of [
        'source_name',
        'url',
        'canonical_url',
        'external_id',
        'description',
        'ref_part',
        'ref_part_count',
      ]) {
        expect(patchedPaths).toContain(`content.external_references.${field}`);
      }
    });

    it('adds canonical_url and ref_parts on a v18 index', async () => {
      const { patchedPaths } = await runMigrations({
        reportMappings: withExternalRefs({ source_name: {}, url: {} }),
      });

      expect(patchedPaths).toContain('content.external_references.canonical_url');
      expect(patchedPaths).toContain('content.external_references.ref_part');
      expect(patchedPaths).toContain('content.external_references.ref_part_count');
    });

    it('adds only ref_parts on a v19 index that has canonical_url', async () => {
      const { patchedPaths } = await runMigrations({
        reportMappings: withExternalRefs({ source_name: {}, url: {}, canonical_url: {} }),
      });

      expect(patchedPaths).toContain('content.external_references.ref_part');
      expect(patchedPaths).not.toContain('content.external_references.canonical_url');
    });

    it('is a no-op when fully migrated', async () => {
      const { patchedPaths } = await runMigrations();
      expect(patchedPaths).toEqual([]);
    });
  });
});

describe('ensureCompanionIndex', () => {
  const runCreateWith = async (createError: unknown) => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.exists.mockResolvedValue(false);
    esClient.indices.get.mockResolvedValue({});
    esClient.indices.getSettings.mockResolvedValue({});
    esClient.indices.create.mockRejectedValue(createError);

    return installIndexTemplates({ esClient, logger: loggingSystemMock.createLogger() });
  };

  it('swallows the concurrent-creation race', async () => {
    await expect(
      runCreateWith({
        statusCode: 400,
        body: { error: { type: 'resource_already_exists_exception' } },
      })
    ).resolves.toBeUndefined();
  });

  it('rethrows other 400s such as a shard-limit failure', async () => {
    // Matching on the 400 status alone hid this: boot succeeded, the index did
    // not exist, and every later write to it failed with no obvious cause.
    await expect(
      runCreateWith({
        statusCode: 400,
        body: { error: { type: 'validation_exception', reason: 'cluster shard limit exceeded' } },
      })
    ).rejects.toBeDefined();
  });
});

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

  it('indicators template declares a top-level space_id keyword (v24 space isolation)', async () => {
    const { byIndex } = await runInstall();

    const properties = (
      byIndex(THREAT_INTEL_INDICATORS_INDEX)?.template?.mappings as {
        properties: Record<string, unknown>;
      }
    ).properties;

    expect(properties).toEqual(expect.objectContaining({ space_id: { type: 'keyword' } }));
  });

  it('migrateExistingIndicatorSpaceIdMapping is wired into installIndexTemplates', () => {
    expect(src).toContain('const migrateExistingIndicatorSpaceIdMapping');

    const installIdx = src.indexOf('export const installIndexTemplates');
    expect(installIdx).toBeGreaterThan(-1);

    const callIdx = src.indexOf('await migrateExistingIndicatorSpaceIdMapping', installIdx);
    expect(callIdx).toBeGreaterThan(installIdx);
  });
});
