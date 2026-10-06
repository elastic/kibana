/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

const loadProfile = (profile: 'minimal' | 'parity') => {
  jest.resetModules();
  process.env.SEED_PROFILE = profile;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./chrysalis_seed') as typeof import('./chrysalis_seed');
};

interface MockClient {
  bulk: jest.Mock;
  deleteByQuery: jest.Mock;
}

const createClient = (): MockClient => ({
  bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
  deleteByQuery: jest.fn().mockResolvedValue({}),
});

const asEs = (client: MockClient) => client as unknown as EsClient;

describe('chrysalis_seed', () => {
  afterEach(() => {
    delete process.env.SEED_PROFILE;
    jest.clearAllMocks();
  });

  describe('seedProfile resolution', () => {
    it('falls back to minimal for the removed enriched profile', () => {
      const mod = loadProfile('minimal');
      expect(mod.seedProfile).toBe('minimal');

      jest.resetModules();
      process.env.SEED_PROFILE = 'enriched';
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fallback = require('./chrysalis_seed') as typeof import('./chrysalis_seed');
      expect(fallback.seedProfile).toBe('minimal');
    });
  });

  describe('seedChrysalisAlerts (minimal profile)', () => {
    it('rejects when the alert bulk reports item-level errors', async () => {
      const { seedChrysalisAlerts } = loadProfile('minimal');
      const client = createClient();
      client.bulk.mockResolvedValueOnce({
        errors: true,
        items: [{ create: { error: { type: 'mapper_parsing_exception', reason: 'bad doc' } } }],
      });

      await expect(seedChrysalisAlerts({ esClient: asEs(client), log })).rejects.toThrow(
        /mapper_parsing_exception/
      );
    });

    it('resolves when every bulk succeeds', async () => {
      const { seedChrysalisAlerts } = loadProfile('minimal');
      const client = createClient();

      await expect(seedChrysalisAlerts({ esClient: asEs(client), log })).resolves.toBeUndefined();
    });
  });

  describe('seedChrysalisAlerts (parity profile) restamping', () => {
    it('shifts nested first_seen by the same offset as @timestamp', async () => {
      const { seedChrysalisAlerts } = loadProfile('parity');
      const { PARITY_DOCS } =
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('./chrysalis_parity_docs') as typeof import('./chrysalis_parity_docs');
      const client = createClient();

      await seedChrysalisAlerts({ esClient: asEs(client), log });

      // Find the bulk body for the threat-intel index and its source doc.
      const tiIndex = 'logs-ti_chrysalis_sim-default';
      const tiCall = client.bulk.mock.calls.find(
        ([arg]) => (arg as { index: string }).index === tiIndex
      );
      expect(tiCall).toBeDefined();
      const seededDocs = (tiCall?.[0] as { operations: unknown[] }).operations.filter(
        (op) => typeof op === 'object' && op !== null && !('create' in (op as object))
      ) as Array<Record<string, unknown>>;

      const seeded = seededDocs.find(
        (d) =>
          (d.threat as { indicator?: { first_seen?: unknown } } | undefined)?.indicator
            ?.first_seen !== undefined
      );
      expect(seeded).toBeDefined();

      const seededIndicator = (seeded!.threat as { indicator: Record<string, unknown> }).indicator;
      const srcDoc = PARITY_DOCS.find(
        ({ index, doc }) =>
          index === tiIndex &&
          (doc.threat as { indicator?: Record<string, unknown> } | undefined)?.indicator
            ?.description === seededIndicator.description
      )!.doc;
      const srcIndicator = (srcDoc.threat as { indicator: Record<string, unknown> }).indicator;
      expect(srcIndicator.first_seen).toBeDefined();

      const tsOffset =
        Date.parse(seeded!['@timestamp'] as string) - Date.parse(srcDoc['@timestamp'] as string);
      const firstSeenOffset =
        Date.parse(seededIndicator.first_seen as string) -
        Date.parse(srcIndicator.first_seen as string);
      const lastSeenOffset =
        Date.parse(seededIndicator.last_seen as string) -
        Date.parse(srcIndicator.last_seen as string);

      // Same doc → identical offset across @timestamp and the nested keys.
      expect(firstSeenOffset).toBe(tsOffset);
      expect(lastSeenOffset).toBe(tsOffset);

      // Offset is a real shift to ~now (positive, large).
      const now = Date.now();
      expect(Date.parse(seeded!['@timestamp'] as string)).toBeGreaterThan(now - 10 * 60 * 1000);
    });
  });
});
