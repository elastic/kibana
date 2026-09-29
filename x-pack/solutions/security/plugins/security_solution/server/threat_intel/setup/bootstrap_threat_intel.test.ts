/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

/**
 * Guard test for ensureThreatIntelBootstrap.
 *
 * WHY this test exists:
 *   installIndexTemplates (template version bumps + migrateExisting* patches)
 *   must run on EVERY boot, not just when the catalog is empty. Gating it
 *   behind the catalog-empty check caused ALL schema migrations (v14–v19) to
 *   silently miss any cluster that had already been seeded — the templates
 *   stayed at the version from the first-ever boot indefinitely.
 *
 *   This test locks the fix: templates install and the fixed catalog reconciles
 *   on every boot, including when the source index is already populated.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { ensureThreatIntelBootstrap } from './bootstrap_threat_intel';
import * as indexTemplatesModule from './index_templates';
import * as seedDefaultSourcesModule from './seed_default_sources';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { THREAT_REPORTS_INDEX } from '../../../common/threat_intel';

vi.mock('./index_templates');
vi.mock('./seed_default_sources');

const makeLogger = (): Mocked<Logger> => {
  const child = {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    get: vi.fn(),
    log: vi.fn(),
    isLevelEnabled: vi.fn(),
  } as unknown as Mocked<Logger>;
  child.get = vi.fn().mockReturnValue(child);
  return child;
};

const makeEsClient = (sourceCount: number): Mocked<ElasticsearchClient> => {
  return {
    count: vi.fn().mockResolvedValue({ count: sourceCount }),
    indices: {
      getFieldMapping: vi.fn().mockResolvedValue({
        [THREAT_REPORTS_INDEX]: {
          mappings: {
            'content.title': {
              full_name: 'content.title',
              mapping: {
                title: { type: 'semantic_text', inference_id: '.default-embedding' },
              },
            },
            'content.body_text': {
              full_name: 'content.body_text',
              mapping: {
                body_text: { type: 'semantic_text', inference_id: '.default-embedding' },
              },
            },
          },
        },
      }),
    },
    inference: { get: vi.fn().mockResolvedValue({}) },
  } as unknown as Mocked<ElasticsearchClient>;
};

describe('ensureThreatIntelBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (indexTemplatesModule.installIndexTemplates as Mock).mockResolvedValue(undefined);
    (seedDefaultSourcesModule.seedDefaultSources as Mock).mockResolvedValue({
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    });
  });

  describe('populated catalog (count > 0)', () => {
    it('calls installIndexTemplates even when the catalog is non-empty', async () => {
      const esClient = makeEsClient(250);
      const logger = makeLogger();

      await ensureThreatIntelBootstrap({ esClient, logger });

      expect(indexTemplatesModule.installIndexTemplates).toHaveBeenCalledTimes(1);
    });

    // Seeding used to be gated on an empty catalog, which made a partial seed
    // permanent: if one bulk attempt created some defaults and Kibana exited before
    // the rest landed, the next boot saw a non-empty catalog and never retried the
    // missing ones. A single operator-created source suppressed seeding entirely.
    // Seeding is idempotent (bulk create by stable id, 409 = already present), so it
    // runs every boot and fills in whatever is absent.
    it('still calls seedDefaultSources when the catalog is non-empty, to finish a partial seed', async () => {
      const esClient = makeEsClient(250);
      const logger = makeLogger();

      await ensureThreatIntelBootstrap({ esClient, logger });

      expect(seedDefaultSourcesModule.seedDefaultSources).toHaveBeenCalled();
    });

    it('returns the seed result even when the catalog is non-empty', async () => {
      const esClient = makeEsClient(250);
      const logger = makeLogger();

      const result = await ensureThreatIntelBootstrap({ esClient, logger });

      // Seeding always runs now, so bootstrap reports what it did rather than
      // returning undefined to mean "skipped".
      expect(result?.seed).toBeDefined();
    });
  });

  describe('empty catalog (count === 0)', () => {
    it('calls installIndexTemplates on an empty catalog too', async () => {
      // count === 0 means first boot — ensure templates install and seeding runs
      const esClient = makeEsClient(0);
      // second count call (inside seedThreatIntelCatalog) also returns 0
      (esClient.count as Mock).mockResolvedValue({ count: 0 });
      const logger = makeLogger();

      await ensureThreatIntelBootstrap({ esClient, logger });

      expect(indexTemplatesModule.installIndexTemplates).toHaveBeenCalledTimes(1);
    });

    it('calls seedDefaultSources when the catalog is empty', async () => {
      const esClient = makeEsClient(0);
      (esClient.count as Mock).mockResolvedValue({ count: 0 });
      const logger = makeLogger();

      await ensureThreatIntelBootstrap({ esClient, logger });

      expect(seedDefaultSourcesModule.seedDefaultSources).toHaveBeenCalledTimes(1);
    });

    // A partial seed used to be treated as success. seedDefaultSources swallows
    // per-item and bulk errors, so the next boot saw a non-empty catalog and
    // skipped seeding forever, permanently omitting the rest of the catalog.
    it('retries seeding when some entries failed, and succeeds once they land', async () => {
      const esClient = makeEsClient(0);
      (esClient.count as Mock).mockResolvedValue({ count: 0 });
      const logger = makeLogger();

      (seedDefaultSourcesModule.seedDefaultSources as Mock)
        .mockResolvedValueOnce({ total: 10, created: 4, updated: 0, skipped: 0, failed: 6 })
        // Retry: the four already created come back as skipped (conflicts are
        // idempotent), and the rest land.
        .mockResolvedValueOnce({ total: 10, created: 6, updated: 0, skipped: 4, failed: 0 });

      const result = await ensureThreatIntelBootstrap({ esClient, logger });

      expect(seedDefaultSourcesModule.seedDefaultSources).toHaveBeenCalledTimes(2);
      expect(result?.seed).toEqual({
        total: 10,
        created: 6,
        updated: 0,
        skipped: 4,
        failed: 0,
      });
    });
  });

  it('skips the semantic_text endpoint check when the reports index does not exist yet', async () => {
    const esClient = makeEsClient(0);
    const notFound = new EsErrors.ResponseError({
      statusCode: 404,
      meta: {} as never,
      warnings: [],
    });
    (esClient.indices.getFieldMapping as Mock).mockRejectedValue(notFound);

    // Bootstrap must resolve — the 404 is not retried and seeding continues.
    await expect(
      ensureThreatIntelBootstrap({ esClient, logger: makeLogger() })
    ).resolves.toBeDefined();
    expect(esClient.indices.getFieldMapping).toHaveBeenCalledTimes(1);
  });

  it('validates the effective semantic_text endpoint from the installed mapping', async () => {
    const esClient = makeEsClient(12);

    await ensureThreatIntelBootstrap({ esClient, logger: makeLogger() });

    expect(esClient.inference.get).toHaveBeenCalledWith({
      inference_id: '.default-embedding',
    });
  });

  it('deduplicates a shared endpoint across title and body_text', async () => {
    const esClient = makeEsClient(12);

    await ensureThreatIntelBootstrap({ esClient, logger: makeLogger() });

    expect(esClient.inference.get).toHaveBeenCalledTimes(2);
  });

  describe('required semantic_text endpoint failure', () => {
    beforeAll(() => {
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('fails readiness when a required field has no effective endpoint', async () => {
      const esClient = makeEsClient(12);
      (esClient.indices.getFieldMapping as Mock).mockResolvedValue({
        [THREAT_REPORTS_INDEX]: {
          mappings: {
            'content.title': {
              full_name: 'content.title',
              mapping: { title: { type: 'semantic_text' } },
            },
            'content.body_text': {
              full_name: 'content.body_text',
              mapping: {
                body_text: { type: 'semantic_text', inference_id: '.default-embedding' },
              },
            },
          },
        },
      });

      const bootstrap = ensureThreatIntelBootstrap({ esClient, logger: makeLogger() });
      const assertion = expect(bootstrap).rejects.toThrow(/content\.title/);
      await vi.runAllTimersAsync();

      await assertion;
    });
  });
});
