/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

import { ensureThreatIntelBootstrap } from './bootstrap_threat_intel';
import * as indexTemplatesModule from './index_templates';
import * as seedDefaultSourcesModule from './seed_default_sources';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { THREAT_REPORTS_INDEX } from '../../../common/threat_intel';

jest.mock('./index_templates');
jest.mock('./seed_default_sources');

const makeLogger = (): jest.Mocked<Logger> => {
  const child = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    get: jest.fn(),
    log: jest.fn(),
    isLevelEnabled: jest.fn(),
  } as unknown as jest.Mocked<Logger>;
  child.get = jest.fn().mockReturnValue(child);
  return child;
};

const makeEsClient = (sourceCount: number): jest.Mocked<ElasticsearchClient> => {
  return {
    count: jest.fn().mockResolvedValue({ count: sourceCount }),
    indices: {
      getFieldMapping: jest.fn().mockResolvedValue({
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
    inference: { get: jest.fn().mockResolvedValue({}) },
  } as unknown as jest.Mocked<ElasticsearchClient>;
};

describe('ensureThreatIntelBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (indexTemplatesModule.installIndexTemplates as jest.Mock).mockResolvedValue(undefined);
    (seedDefaultSourcesModule.seedDefaultSources as jest.Mock).mockResolvedValue({
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
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });
      const logger = makeLogger();

      await ensureThreatIntelBootstrap({ esClient, logger });

      expect(indexTemplatesModule.installIndexTemplates).toHaveBeenCalledTimes(1);
    });

    it('calls seedDefaultSources when the catalog is empty', async () => {
      const esClient = makeEsClient(0);
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });
      const logger = makeLogger();

      await ensureThreatIntelBootstrap({ esClient, logger });

      expect(seedDefaultSourcesModule.seedDefaultSources).toHaveBeenCalledTimes(1);
    });

    // A partial seed used to be treated as success. seedDefaultSources swallows
    // per-item and bulk errors, so the next boot saw a non-empty catalog and
    // skipped seeding forever, permanently omitting the rest of the catalog.
    it('retries seeding when some entries failed, and succeeds once they land', async () => {
      const esClient = makeEsClient(0);
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });
      const logger = makeLogger();

      (seedDefaultSourcesModule.seedDefaultSources as jest.Mock)
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
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('fails readiness when a required field has no effective endpoint', async () => {
      const esClient = makeEsClient(12);
      (esClient.indices.getFieldMapping as jest.Mock).mockResolvedValue({
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
      await jest.runAllTimersAsync();

      await assertion;
    });
  });
});
