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
    it('defaults to minimal when SEED_PROFILE is unset or empty', () => {
      delete process.env.SEED_PROFILE;
      let unset: typeof import('./chrysalis_seed');
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        unset = require('./chrysalis_seed');
      });
      expect(unset!.seedProfile).toBe('minimal');

      process.env.SEED_PROFILE = '';
      let empty: typeof import('./chrysalis_seed');
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        empty = require('./chrysalis_seed');
      });
      expect(empty!.seedProfile).toBe('minimal');
    });

    it('resolves explicit minimal and parity', () => {
      expect(loadProfile('minimal').seedProfile).toBe('minimal');
      expect(loadProfile('parity').seedProfile).toBe('parity');
    });

    it('throws for the removed enriched profile instead of silently falling back', () => {
      process.env.SEED_PROFILE = 'enriched';
      expect(() => {
        jest.isolateModules(() => {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('./chrysalis_seed');
        });
      }).toThrow(/enriched.*minimal.*parity|Unknown SEED_PROFILE 'enriched'/s);
    });

    it('throws for any other unknown profile (case-sensitive)', () => {
      process.env.SEED_PROFILE = 'Parity';
      expect(() => {
        jest.isolateModules(() => {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('./chrysalis_seed');
        });
      }).toThrow(/Unknown SEED_PROFILE 'Parity'/);
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

  describe('cleanupChrysalisAlerts is id-scoped', () => {
    it('deletes only the seeded alert ids, never match_all', async () => {
      const { seedChrysalisAlerts, cleanupChrysalisAlerts } = loadProfile('minimal');
      const client = createClient();

      await seedChrysalisAlerts({ esClient: asEs(client), log });
      // Minimal seeding assigns deterministic ids via the seed prefix.
      const bulkOps = client.bulk.mock.calls[0][0] as { operations: unknown[] };
      const createIds = bulkOps.operations
        .filter((op) => typeof op === 'object' && op !== null && 'create' in (op as object))
        .map((op) => (op as { create: { _id: string } }).create._id);
      expect(createIds).toEqual([
        'persona-matrix-seed-.internal.alerts-security.alerts-default-000001-0',
        'persona-matrix-seed-.internal.alerts-security.alerts-default-000001-1',
        'persona-matrix-seed-.internal.alerts-security.alerts-default-000001-2',
      ]);

      await cleanupChrysalisAlerts({ esClient: asEs(client), log });

      const deletes = client.deleteByQuery.mock.calls.filter(
        ([arg]) =>
          (arg as { index: string }).index === '.internal.alerts-security.alerts-default-000001'
      );
      expect(deletes).toHaveLength(1);
      const query = (deletes[0][0] as { query: unknown }).query;
      expect(query).not.toEqual({ match_all: {} });
      const ids = (query as { ids: { values: string[] } }).ids.values;
      // Default cleanup sweeps every id a seed call could have written; the
      // three seeded ids must all be covered.
      expect(ids).toEqual(
        expect.arrayContaining([
          'persona-matrix-seed-.internal.alerts-security.alerts-default-000001-0',
          'persona-matrix-seed-.internal.alerts-security.alerts-default-000001-1',
          'persona-matrix-seed-.internal.alerts-security.alerts-default-000001-2',
        ])
      );
    });

    it('cleans up every alert when seeding more than the default count and cleaning up with defaults', async () => {
      const { seedChrysalisAlerts, cleanupChrysalisAlerts } = loadProfile('minimal');
      const client = createClient();

      await seedChrysalisAlerts({ esClient: asEs(client), log, count: 5 });
      await cleanupChrysalisAlerts({ esClient: asEs(client), log });

      const deletes = client.deleteByQuery.mock.calls.filter(
        ([arg]) =>
          (arg as { index: string }).index === '.internal.alerts-security.alerts-default-000001'
      );
      expect(deletes).toHaveLength(1);
      const query = (deletes[0][0] as { query: { ids?: { values: string[] } } }).query;
      const values = query.ids?.values ?? [];
      // Default cleanup covers every id a seed call could have written, so all
      // five seeded ids (<0..4>) must be swept — none left behind.
      expect(values).toContain(
        'persona-matrix-seed-.internal.alerts-security.alerts-default-000001-4'
      );
      expect(values).toContain(
        'persona-matrix-seed-.internal.alerts-security.alerts-default-000001-0'
      );
    });
  });

  describe('alert count guard', () => {
    it('rejects non-integer, zero, negative, and out-of-range counts on seed and cleanup', async () => {
      const { seedChrysalisAlerts, cleanupChrysalisAlerts } = loadProfile('minimal');
      const client = createClient();

      for (const bad of [0, -1, 2.5, 51]) {
        await expect(
          seedChrysalisAlerts({ esClient: asEs(client), log, count: bad })
        ).rejects.toThrow(/Invalid alert count/);
        await expect(
          cleanupChrysalisAlerts({ esClient: asEs(client), log, count: bad })
        ).rejects.toThrow(/Invalid alert count/);
      }
      expect(client.bulk).not.toHaveBeenCalled();
      expect(client.deleteByQuery).not.toHaveBeenCalled();
    });
  });
});
