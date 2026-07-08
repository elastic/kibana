/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Guard test for ensureThreatIntelligenceBootstrap.
 *
 * WHY this test exists:
 *   installIndexTemplates (template version bumps + migrateExisting* patches)
 *   must run on EVERY boot, not just when the catalog is empty. Gating it
 *   behind the catalog-empty check caused ALL schema migrations (v14–v19) to
 *   silently miss any cluster that had already been seeded — the templates
 *   stayed at the version from the first-ever boot indefinitely.
 *
 *   This test locks the fix: assert installIndexTemplates is called even when
 *   the sources catalog already has docs, and seedDefaultSources is NOT called
 *   in that case (seeding remains catalog-gated).
 */

import { ensureThreatIntelligenceBootstrap } from './bootstrap_threat_intelligence';
import * as indexTemplatesModule from './index_templates';
import * as seedDefaultSourcesModule from './seed_default_sources';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

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
    inference: { get: jest.fn().mockResolvedValue({}) },
  } as unknown as jest.Mocked<ElasticsearchClient>;
};

describe('ensureThreatIntelligenceBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (indexTemplatesModule.installIndexTemplates as jest.Mock).mockResolvedValue(undefined);
    (seedDefaultSourcesModule.seedDefaultSources as jest.Mock).mockResolvedValue({
      total: 0,
      created: 0,
      skipped: 0,
      failed: 0,
    });
  });

  describe('populated catalog (count > 0)', () => {
    it('calls installIndexTemplates even when the catalog is non-empty', async () => {
      const esClient = makeEsClient(250);
      const logger = makeLogger();

      await ensureThreatIntelligenceBootstrap({ esClient, logger });

      expect(indexTemplatesModule.installIndexTemplates).toHaveBeenCalledTimes(1);
    });

    it('does NOT call seedDefaultSources when the catalog is non-empty', async () => {
      const esClient = makeEsClient(250);
      const logger = makeLogger();

      await ensureThreatIntelligenceBootstrap({ esClient, logger });

      expect(seedDefaultSourcesModule.seedDefaultSources).not.toHaveBeenCalled();
    });

    it('returns undefined when catalog is non-empty (seeding skipped)', async () => {
      const esClient = makeEsClient(1);
      const logger = makeLogger();

      const result = await ensureThreatIntelligenceBootstrap({ esClient, logger });

      expect(result).toBeUndefined();
    });
  });

  describe('empty catalog (count === 0)', () => {
    it('calls installIndexTemplates on an empty catalog too', async () => {
      // count === 0 means first boot — ensure templates install and seeding runs
      const esClient = makeEsClient(0);
      // second count call (inside seedThreatIntelligenceCatalog) also returns 0
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });
      const logger = makeLogger();

      await ensureThreatIntelligenceBootstrap({ esClient, logger });

      expect(indexTemplatesModule.installIndexTemplates).toHaveBeenCalledTimes(1);
    });

    it('calls seedDefaultSources when the catalog is empty', async () => {
      const esClient = makeEsClient(0);
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });
      const logger = makeLogger();

      await ensureThreatIntelligenceBootstrap({ esClient, logger });

      expect(seedDefaultSourcesModule.seedDefaultSources).toHaveBeenCalledTimes(1);
    });
  });
});
