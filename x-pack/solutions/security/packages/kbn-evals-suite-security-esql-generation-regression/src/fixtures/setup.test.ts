/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { cleanupEsqlFixtures } from './setup';

interface ResolveResponse {
  indices: Array<{ name: string }>;
  aliases?: Array<{ name: string }>;
  data_streams?: Array<{ name: string }>;
}

interface FakeEsClient {
  indices: {
    resolveIndex: jest.Mock<Promise<ResolveResponse>, [unknown]>;
    delete: jest.Mock<Promise<unknown>, [unknown]>;
    deleteDataStream: jest.Mock<Promise<unknown>, [unknown]>;
  };
}

const makeLog = (): ToolingLog =>
  ({
    info: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as unknown as ToolingLog);

const makeEsClient = (overrides?: Partial<FakeEsClient['indices']>): FakeEsClient => ({
  indices: {
    resolveIndex: jest.fn().mockResolvedValue({ indices: [], aliases: [], data_streams: [] }),
    delete: jest.fn().mockResolvedValue({}),
    deleteDataStream: jest.fn().mockResolvedValue({}),
    ...overrides,
  },
});

describe('cleanupEsqlFixtures', () => {
  it('resolves wildcard patterns before deleting concrete indices', async () => {
    const esClient = makeEsClient({
      resolveIndex: jest
        .fn()
        .mockResolvedValueOnce({
          indices: [{ name: 'postgres-logs-production.evaluations.2025.01.01' }],
        })
        .mockResolvedValue({ indices: [] }),
    });

    await cleanupEsqlFixtures({
      esClient: esClient as unknown as Parameters<typeof cleanupEsqlFixtures>[0]['esClient'],
      log: makeLog(),
    });

    expect(esClient.indices.resolveIndex).toHaveBeenCalled();
    expect(esClient.indices.delete).toHaveBeenCalledTimes(1);
    expect(esClient.indices.delete).toHaveBeenCalledWith({
      index: ['postgres-logs-production.evaluations.2025.01.01'],
    });
  });

  it('does not pass wildcard patterns to indices.delete (avoids destructive_requires_name)', async () => {
    const esClient = makeEsClient({
      resolveIndex: jest
        .fn()
        .mockResolvedValueOnce({
          indices: [{ name: 'postgres-logs-production.evaluations.2025.01.01' }],
        })
        .mockResolvedValueOnce({
          indices: [{ name: 'logs-production.evaluations.2025.01.01' }],
        })
        .mockResolvedValue({ indices: [] }),
    });

    await cleanupEsqlFixtures({
      esClient: esClient as unknown as Parameters<typeof cleanupEsqlFixtures>[0]['esClient'],
      log: makeLog(),
    });

    for (const call of esClient.indices.delete.mock.calls) {
      const args = call[0] as { index: string[] };
      for (const name of args.index) {
        expect(name).not.toContain('*');
      }
    }
  });

  it('skips delete when no indices were resolved', async () => {
    const esClient = makeEsClient(); // every resolve returns indices: []

    await cleanupEsqlFixtures({
      esClient: esClient as unknown as Parameters<typeof cleanupEsqlFixtures>[0]['esClient'],
      log: makeLog(),
    });

    expect(esClient.indices.delete).not.toHaveBeenCalled();
    expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
  });

  it('deletes data streams when resolved', async () => {
    const esClient = makeEsClient({
      resolveIndex: jest
        .fn()
        .mockResolvedValueOnce({
          indices: [],
          data_streams: [{ name: 'traces-apm-production.evaluations.2025.01.01' }],
        })
        .mockResolvedValue({ indices: [] }),
    });

    await cleanupEsqlFixtures({
      esClient: esClient as unknown as Parameters<typeof cleanupEsqlFixtures>[0]['esClient'],
      log: makeLog(),
    });

    expect(esClient.indices.deleteDataStream).toHaveBeenCalledTimes(1);
    expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith({
      name: ['traces-apm-production.evaluations.2025.01.01'],
    });
  });

  it('continues if one pattern fails to resolve', async () => {
    const log = makeLog();
    const esClient = makeEsClient({
      resolveIndex: jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({
          indices: [{ name: 'logs-production.evaluations.2025.01.01' }],
        })
        .mockResolvedValue({ indices: [] }),
    });

    await cleanupEsqlFixtures({
      esClient: esClient as unknown as Parameters<typeof cleanupEsqlFixtures>[0]['esClient'],
      log,
    });

    expect(log.warning).toHaveBeenCalled();
    expect(esClient.indices.delete).toHaveBeenCalledWith({
      index: ['logs-production.evaluations.2025.01.01'],
    });
  });

  it('deduplicates index names returned by overlapping patterns', async () => {
    const esClient = makeEsClient({
      resolveIndex: jest
        .fn()
        .mockResolvedValueOnce({
          indices: [{ name: 'logs-production.evaluations.2025.01.01' }],
        })
        .mockResolvedValueOnce({
          indices: [{ name: 'logs-production.evaluations.2025.01.01' }],
        })
        .mockResolvedValue({ indices: [] }),
    });

    await cleanupEsqlFixtures({
      esClient: esClient as unknown as Parameters<typeof cleanupEsqlFixtures>[0]['esClient'],
      log: makeLog(),
    });

    expect(esClient.indices.delete).toHaveBeenCalledTimes(1);
    const args = esClient.indices.delete.mock.calls[0][0] as { index: string[] };
    expect(args.index).toEqual(['logs-production.evaluations.2025.01.01']);
  });
});
