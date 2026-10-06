/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

const loadEnriched = () => {
  jest.resetModules();
  process.env.SEED_PROFILE = 'enriched';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./chrysalis_seed') as typeof import('./chrysalis_seed');
};

interface MockClient {
  bulk: jest.Mock;
  deleteByQuery: jest.Mock;
  indices: {
    exists: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    createDataStream: jest.Mock;
    deleteDataStream: jest.Mock;
  };
}

const createClient = (existing: string[] = []): MockClient => ({
  bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
  deleteByQuery: jest.fn().mockResolvedValue({}),
  indices: {
    exists: jest.fn(async ({ index }: { index: string }) => existing.includes(index)),
    create: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    createDataStream: jest.fn(async ({ name }: { name: string }) => {
      if (existing.includes(name)) {
        throw Object.assign(new Error('exists'), {
          meta: { body: { error: { type: 'resource_already_exists_exception' } } },
        });
      }
      return {};
    }),
    deleteDataStream: jest.fn().mockResolvedValue({}),
  },
});

const asEs = (client: MockClient) => client as unknown as EsClient;

describe('chrysalis_seed (enriched profile)', () => {
  afterEach(() => {
    delete process.env.SEED_PROFILE;
    jest.clearAllMocks();
  });

  describe('seedChrysalisAlerts', () => {
    it('rejects when the alert bulk reports item-level errors', async () => {
      const { seedChrysalisAlerts } = loadEnriched();
      const client = createClient();
      client.bulk.mockResolvedValueOnce({
        errors: true,
        items: [{ create: { error: { type: 'mapper_parsing_exception', reason: 'bad doc' } } }],
      });

      await expect(seedChrysalisAlerts({ esClient: asEs(client), log })).rejects.toThrow(
        /mapper_parsing_exception/
      );
    });

    it('rejects when an enriched source bulk reports item-level errors', async () => {
      const { seedChrysalisAlerts } = loadEnriched();
      const client = createClient();
      client.bulk
        .mockResolvedValueOnce({ errors: false, items: [] }) // alerts
        .mockResolvedValueOnce({
          errors: true,
          items: [
            { create: { error: { type: 'version_conflict_engine_exception', reason: 'x' } } },
          ],
        });

      await expect(seedChrysalisAlerts({ esClient: asEs(client), log })).rejects.toThrow(
        /version_conflict_engine_exception/
      );
    });

    it('rejects when creating an enriched source fails for a reason other than already-exists', async () => {
      const { seedChrysalisAlerts } = loadEnriched();
      const client = createClient();
      client.indices.createDataStream.mockRejectedValueOnce(new Error('security_exception'));

      await expect(seedChrysalisAlerts({ esClient: asEs(client), log })).rejects.toThrow(
        /security_exception/
      );
    });

    it('resolves when every bulk succeeds', async () => {
      const { seedChrysalisAlerts } = loadEnriched();
      const client = createClient();

      await expect(seedChrysalisAlerts({ esClient: asEs(client), log })).resolves.toBeUndefined();
    });
  });

  describe('cleanupChrysalisAlerts', () => {
    it('deletes resources this run created', async () => {
      const { seedChrysalisAlerts, cleanupChrysalisAlerts, TELEMETRY_INDEX, ENTITY_RISK_INDEX } =
        loadEnriched();
      const client = createClient();

      await seedChrysalisAlerts({ esClient: asEs(client), log });
      await cleanupChrysalisAlerts({ esClient: asEs(client), log });

      expect(client.indices.deleteDataStream).toHaveBeenCalledWith({ name: TELEMETRY_INDEX });
      expect(client.indices.delete).toHaveBeenCalledWith({ index: ENTITY_RISK_INDEX });
    });

    it('never deletes pre-existing resources; it removes only the seeded doc ids from them', async () => {
      const {
        seedChrysalisAlerts,
        cleanupChrysalisAlerts,
        TELEMETRY_INDEX,
        ENTITY_RISK_INDEX,
        SECURITY_LABS_INDEX,
      } = loadEnriched();
      const client = createClient([TELEMETRY_INDEX, ENTITY_RISK_INDEX, SECURITY_LABS_INDEX]);

      await seedChrysalisAlerts({ esClient: asEs(client), log });
      await cleanupChrysalisAlerts({ esClient: asEs(client), log });

      expect(client.indices.deleteDataStream).not.toHaveBeenCalled();
      expect(client.indices.delete).not.toHaveBeenCalled();

      const seededIds = client.bulk.mock.calls
        .filter(([{ index }]) => index === TELEMETRY_INDEX)
        .flatMap(([{ operations }]) => operations)
        .filter((op: Record<string, unknown>) => 'create' in op)
        .map((op: { create: { _id: string } }) => op.create._id);
      expect(seededIds.length).toBeGreaterThan(0);

      const scopedDelete = client.deleteByQuery.mock.calls.find(
        ([arg]) => arg.index === TELEMETRY_INDEX
      );
      expect(scopedDelete?.[0].query).toEqual({ ids: { values: seededIds } });
    });
  });
});
