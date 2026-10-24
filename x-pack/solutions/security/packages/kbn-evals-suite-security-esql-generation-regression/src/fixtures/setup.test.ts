/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { esqlGenerationDataset } from '../dataset';
import {
  enrichPolicyNamesInGoldQueries,
  esqlFixtureEnrichPolicies,
  esqlFixtureEnrichPolicyNames,
  goldQueriesFromDataset,
} from './enrich';
import { cleanupEsqlFixtures, setupEsqlFixtures } from './setup';

interface ResolveResponse {
  indices: Array<{ name: string }>;
  aliases?: Array<{ name: string }>;
  data_streams?: Array<{ name: string }>;
}

interface FakeEsClient {
  index: jest.Mock<Promise<unknown>, [unknown]>;
  indices: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
    refresh: jest.Mock<Promise<unknown>, [unknown]>;
    resolveIndex: jest.Mock<Promise<ResolveResponse>, [unknown]>;
    delete: jest.Mock<Promise<unknown>, [unknown]>;
    deleteDataStream: jest.Mock<Promise<unknown>, [unknown]>;
  };
  enrich: {
    putPolicy: jest.Mock<Promise<unknown>, [unknown]>;
    executePolicy: jest.Mock<Promise<unknown>, [unknown]>;
    deletePolicy: jest.Mock<Promise<unknown>, [unknown, unknown?]>;
  };
  esql: {
    query: jest.Mock<Promise<unknown>, [unknown]>;
  };
}

const makeLog = (): ToolingLog =>
  ({
    info: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as unknown as ToolingLog);

const makeEsClient = (overrides?: {
  index?: FakeEsClient['index'];
  indices?: Partial<FakeEsClient['indices']>;
  enrich?: Partial<FakeEsClient['enrich']>;
  esql?: Partial<FakeEsClient['esql']>;
}): FakeEsClient => ({
  index: overrides?.index ?? jest.fn().mockResolvedValue({}),
  indices: {
    create: jest.fn().mockResolvedValue({}),
    refresh: jest.fn().mockResolvedValue({}),
    resolveIndex: jest.fn().mockResolvedValue({ indices: [], aliases: [], data_streams: [] }),
    delete: jest.fn().mockResolvedValue({}),
    deleteDataStream: jest.fn().mockResolvedValue({}),
    ...overrides?.indices,
  },
  enrich: {
    putPolicy: jest.fn().mockResolvedValue({ acknowledged: true }),
    executePolicy: jest.fn().mockResolvedValue({ status: { phase: 'COMPLETE' } }),
    deletePolicy: jest.fn().mockResolvedValue({ acknowledged: true }),
    ...overrides?.enrich,
  },
  esql: {
    query: jest.fn().mockResolvedValue({ columns: [], values: [] }),
    ...overrides?.esql,
  },
});

const asEsClient = (esClient: FakeEsClient) =>
  esClient as unknown as Parameters<typeof setupEsqlFixtures>[0]['esClient'];

describe('setupEsqlFixtures', () => {
  it('installs every enrich policy the dataset gold queries reference', () => {
    const goldPolicies = enrichPolicyNamesInGoldQueries(
      goldQueriesFromDataset(esqlGenerationDataset)
    );

    // Guard the guard: the two ENRICH golds are what makes this test meaningful.
    expect(goldPolicies).toEqual(expect.arrayContaining(['win_events', 'ldap_lookup_new']));

    for (const policyName of goldPolicies) {
      expect(esqlFixtureEnrichPolicyNames).toContain(policyName);
    }
  });

  it('creates each enrich source index and seeds its lookup documents', async () => {
    const esClient = makeEsClient();

    await setupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() });

    const createdIndices = esClient.indices.create.mock.calls.map(
      (call) => (call[0] as { index: string }).index
    );
    for (const fixture of esqlFixtureEnrichPolicies) {
      expect(createdIndices).toContain(fixture.sourceIndexCreateRequest.index);
      const indexed = esClient.index.mock.calls
        .map((call) => call[0] as { index: string })
        .filter((request) => request.index === fixture.sourceIndexCreateRequest.index);
      expect(indexed).toHaveLength(fixture.sourceDocuments.length);
    }
  });

  it('creates and executes a policy for every enrich fixture', async () => {
    const esClient = makeEsClient();

    await setupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() });

    for (const fixture of esqlFixtureEnrichPolicies) {
      expect(esClient.enrich.putPolicy).toHaveBeenCalledWith({
        name: fixture.policyName,
        match: fixture.policy,
      });
      expect(esClient.enrich.executePolicy).toHaveBeenCalledWith({
        name: fixture.policyName,
        wait_for_completion: true,
      });
    }
  });

  it('verifies every policy resolves with a probe query before the dataset runs', async () => {
    const esClient = makeEsClient();

    await setupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() });

    const probes = esClient.esql.query.mock.calls.map(
      (call) => (call[0] as { query: string }).query
    );
    for (const fixture of esqlFixtureEnrichPolicies) {
      expect(probes).toContain(fixture.probeQuery);
      // The probe is only meaningful if it actually exercises the policy.
      expect(fixture.probeQuery).toContain(`ENRICH ${fixture.policyName} `);
    }
  });

  it('fails fast, naming the policy, when a policy does not resolve on the cluster', async () => {
    const esClient = makeEsClient({
      esql: {
        query: jest
          .fn()
          .mockRejectedValue(
            new Error('verification_exception: cannot find enrich policy [win_events]')
          ),
      },
    });

    await expect(
      setupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() })
    ).rejects.toThrow(/win_events/);
  });

  it('fails fast when a gold references an enrich policy no fixture installs', async () => {
    const dataset = jest.requireActual<typeof import('../dataset')>('../dataset');
    const example = dataset.esqlGenerationDataset[0];
    const gold = example.output;
    if (!gold) {
      throw new Error('dataset example 0 has no gold output');
    }
    jest.replaceProperty(gold, 'query', `${gold.query}\n| ENRICH not_provisioned ON event.code`);

    try {
      const esClient = makeEsClient();
      await expect(
        setupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() })
      ).rejects.toThrow(/not_provisioned/);
    } finally {
      jest.restoreAllMocks();
    }
  });
});

describe('cleanupEsqlFixtures', () => {
  it('deletes every installed enrich policy', async () => {
    const esClient = makeEsClient();

    await cleanupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() });

    for (const fixture of esqlFixtureEnrichPolicies) {
      expect(esClient.enrich.deletePolicy).toHaveBeenCalledWith(
        { name: fixture.policyName },
        { ignore: [404] }
      );
    }
  });

  it('sweeps the enrich source indices by wildcard', async () => {
    const esClient = makeEsClient({
      indices: {
        resolveIndex: jest
          .fn()
          .mockResolvedValueOnce({ indices: [{ name: 'esql-enrich-win-events' }] })
          .mockResolvedValue({ indices: [] }),
      },
    });

    await cleanupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() });

    expect(esClient.indices.delete).toHaveBeenCalledWith({
      index: ['esql-enrich-win-events'],
    });
  });

  it('continues when deleting an enrich policy fails', async () => {
    const log = makeLog();
    const esClient = makeEsClient({
      enrich: { deletePolicy: jest.fn().mockRejectedValue(new Error('boom')) },
    });

    await cleanupEsqlFixtures({ esClient: asEsClient(esClient), log });

    expect(log.warning).toHaveBeenCalled();
    expect(esClient.enrich.deletePolicy).toHaveBeenCalledTimes(esqlFixtureEnrichPolicies.length);
  });

  it('resolves wildcard patterns before deleting concrete indices', async () => {
    const esClient = makeEsClient({
      indices: {
        resolveIndex: jest
          .fn()
          .mockResolvedValueOnce({
            indices: [{ name: 'postgres-logs-production.evaluations.2025.01.01' }],
          })
          .mockResolvedValue({ indices: [] }),
      },
    });

    await cleanupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() });

    expect(esClient.indices.resolveIndex).toHaveBeenCalled();
    expect(esClient.indices.delete).toHaveBeenCalledTimes(1);
    expect(esClient.indices.delete).toHaveBeenCalledWith({
      index: ['postgres-logs-production.evaluations.2025.01.01'],
    });
  });

  it('does not pass wildcard patterns to indices.delete (avoids destructive_requires_name)', async () => {
    const esClient = makeEsClient({
      indices: {
        resolveIndex: jest
          .fn()
          .mockResolvedValueOnce({
            indices: [{ name: 'postgres-logs-production.evaluations.2025.01.01' }],
          })
          .mockResolvedValueOnce({
            indices: [{ name: 'logs-production.evaluations.2025.01.01' }],
          })
          .mockResolvedValue({ indices: [] }),
      },
    });

    await cleanupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() });

    for (const call of esClient.indices.delete.mock.calls) {
      const args = call[0] as { index: string[] };
      for (const name of args.index) {
        expect(name).not.toContain('*');
      }
    }
  });

  it('skips delete when no indices were resolved', async () => {
    const esClient = makeEsClient(); // every resolve returns indices: []

    await cleanupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() });

    expect(esClient.indices.delete).not.toHaveBeenCalled();
    expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
  });

  it('deletes data streams when resolved', async () => {
    const esClient = makeEsClient({
      indices: {
        resolveIndex: jest
          .fn()
          .mockResolvedValueOnce({
            indices: [],
            data_streams: [{ name: 'traces-apm-production.evaluations.2025.01.01' }],
          })
          .mockResolvedValue({ indices: [] }),
      },
    });

    await cleanupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() });

    expect(esClient.indices.deleteDataStream).toHaveBeenCalledTimes(1);
    expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith({
      name: ['traces-apm-production.evaluations.2025.01.01'],
    });
  });

  it('continues if one pattern fails to resolve', async () => {
    const log = makeLog();
    const esClient = makeEsClient({
      indices: {
        resolveIndex: jest
          .fn()
          .mockRejectedValueOnce(new Error('boom'))
          .mockResolvedValueOnce({
            indices: [{ name: 'logs-production.evaluations.2025.01.01' }],
          })
          .mockResolvedValue({ indices: [] }),
      },
    });

    await cleanupEsqlFixtures({ esClient: asEsClient(esClient), log });

    expect(log.warning).toHaveBeenCalled();
    expect(esClient.indices.delete).toHaveBeenCalledWith({
      index: ['logs-production.evaluations.2025.01.01'],
    });
  });

  it('deduplicates index names returned by overlapping patterns', async () => {
    const esClient = makeEsClient({
      indices: {
        resolveIndex: jest
          .fn()
          .mockResolvedValueOnce({
            indices: [{ name: 'logs-production.evaluations.2025.01.01' }],
          })
          .mockResolvedValueOnce({
            indices: [{ name: 'logs-production.evaluations.2025.01.01' }],
          })
          .mockResolvedValue({ indices: [] }),
      },
    });

    await cleanupEsqlFixtures({ esClient: asEsClient(esClient), log: makeLog() });

    expect(esClient.indices.delete).toHaveBeenCalledTimes(1);
    const args = esClient.indices.delete.mock.calls[0][0] as { index: string[] };
    expect(args.index).toEqual(['logs-production.evaluations.2025.01.01']);
  });
});
