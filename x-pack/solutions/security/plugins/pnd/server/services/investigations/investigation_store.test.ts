/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { InvestigationStore } from './investigation_store';
import { MAPPINGS_VERSION } from './mappings';

/**
 * Migration behaviour for the move off `dynamic: true`.
 *
 * ES cannot change an existing field's type in place, so an index created under
 * dynamic mapping keeps `confidence` as `long` forever — silently truncating
 * 0.85 to 0. These indices hold demo seed data and reproducible Watch output,
 * so the chosen fix is delete-and-reseed rather than a reindex.
 */
describe('InvestigationStore index migration', () => {
  const makeEsClient = (opts: { exists: boolean; mappingsVersion?: number | 'unreadable' }) => {
    const getMapping = jest.fn().mockImplementation(({ index }: { index: string }) => {
      if (opts.mappingsVersion === 'unreadable') {
        return Promise.reject(new Error('mapping unavailable'));
      }
      // Key by the requested index — the store bootstraps five of them, and a
      // mock that only answers for one makes the rest look stale.
      return Promise.resolve({
        [index]: {
          mappings:
            opts.mappingsVersion == null
              ? {} // legacy index: created under dynamic mapping, no marker
              : { _meta: { mappingsVersion: opts.mappingsVersion } },
        },
      });
    });

    return {
      indices: {
        exists: jest.fn().mockResolvedValue(opts.exists),
        create: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        getMapping,
      },
      count: jest.fn().mockResolvedValue({ count: 1 }), // non-empty: skip seeding
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    } as unknown as Parameters<InvestigationStore['ensureReady']>[0] & {
      indices: {
        exists: jest.Mock;
        create: jest.Mock;
        delete: jest.Mock;
        getMapping: jest.Mock;
      };
    };
  };

  const run = async (opts: { exists: boolean; mappingsVersion?: number | 'unreadable' }) => {
    const esClient = makeEsClient(opts);
    const store = new InvestigationStore(loggingSystemMock.createLogger());
    await store.ensureReady(esClient);
    return esClient;
  };

  it('creates indices with the version marker when none exist', async () => {
    const es = await run({ exists: false });

    expect(es.indices.delete).not.toHaveBeenCalled();
    expect(es.indices.create).toHaveBeenCalled();

    const [{ mappings }] = es.indices.create.mock.calls[0];
    expect(mappings._meta.mappingsVersion).toBe(MAPPINGS_VERSION);
    expect(mappings.dynamic).toBe(false);
  });

  it('leaves an index alone when its marker matches the current version', async () => {
    const es = await run({ exists: true, mappingsVersion: MAPPINGS_VERSION });

    expect(es.indices.delete).not.toHaveBeenCalled();
    expect(es.indices.create).not.toHaveBeenCalled();
  });

  it('deletes and recreates a legacy index that has no version marker', async () => {
    // The real-world case: every index created while `dynamic: true` was in use.
    const es = await run({ exists: true });

    // All five PND indices are legacy in this scenario, so all five are rebuilt.
    expect(es.indices.delete).toHaveBeenCalledTimes(5);
    expect(es.indices.create).toHaveBeenCalledTimes(5);
    expect(es.indices.delete.mock.invocationCallOrder[0]).toBeLessThan(
      es.indices.create.mock.invocationCallOrder[0]
    );
  });

  it('deletes and recreates an index stamped with an older version', async () => {
    const es = await run({ exists: true, mappingsVersion: MAPPINGS_VERSION - 1 });

    expect(es.indices.delete).toHaveBeenCalled();
    expect(es.indices.create).toHaveBeenCalled();
  });

  it('treats an unreadable mapping as stale rather than assuming it is current', async () => {
    // Fail toward recreating: querying a mis-mapped index returns wrong results
    // silently, which is worse than dropping reproducible demo data.
    const es = await run({ exists: true, mappingsVersion: 'unreadable' });

    expect(es.indices.delete).toHaveBeenCalled();
    expect(es.indices.create).toHaveBeenCalled();
  });
});

/**
 * `reconcileInvestigationAfterDecision` closes the gap where
 * `updateProposalStatus` only writes the proposal document: the Brief queue
 * card's primary CTA is driven by the investigation's own
 * `pendingProposalCount`, so without this reconciliation an investigation
 * whose only proposal was just decided keeps advertising a stale
 * pre-decision action (bug: "Isolate endpoint" shown next to a proposal
 * already marked "Escalated").
 */
describe('InvestigationStore#reconcileInvestigationAfterDecision', () => {
  const makeReadyEsClient = (pendingCount: number) => {
    const update = jest.fn().mockResolvedValue({});
    const count = jest.fn().mockResolvedValue({ count: pendingCount });
    return {
      indices: {
        exists: jest.fn().mockResolvedValue(true),
        create: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        getMapping: jest.fn().mockResolvedValue({
          'pnd-investigations': { mappings: { _meta: { mappingsVersion: MAPPINGS_VERSION } } },
          'pnd-proposals': { mappings: { _meta: { mappingsVersion: MAPPINGS_VERSION } } },
          'pnd-evidence': { mappings: { _meta: { mappingsVersion: MAPPINGS_VERSION } } },
          'pnd-worker-evaluations': { mappings: { _meta: { mappingsVersion: MAPPINGS_VERSION } } },
          'pnd-canonical-proposals': {
            mappings: { _meta: { mappingsVersion: MAPPINGS_VERSION } },
          },
        }),
      },
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
      count,
      update,
    } as unknown as Parameters<InvestigationStore['ensureReady']>[0] & {
      count: jest.Mock;
      update: jest.Mock;
    };
  };

  it('recounts pending proposals from the proposal index rather than decrementing', async () => {
    const esClient = makeReadyEsClient(0);
    const store = new InvestigationStore(loggingSystemMock.createLogger());

    await store.reconcileInvestigationAfterDecision(esClient, 'inv-floor-ransom-008');

    expect(esClient.count).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'pnd-proposals',
        query: {
          bool: {
            filter: [
              { term: { investigationId: 'inv-floor-ransom-008' } },
              { term: { status: 'pending' } },
            ],
          },
        },
      })
    );
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'pnd-investigations',
        id: 'inv-floor-ransom-008',
        doc: expect.objectContaining({ pendingProposalCount: 0 }),
      })
    );
  });

  it('reflects an outstanding pending proposal instead of clearing to zero unconditionally', async () => {
    const esClient = makeReadyEsClient(2);
    const store = new InvestigationStore(loggingSystemMock.createLogger());

    await store.reconcileInvestigationAfterDecision(esClient, 'inv-multi-proposal');

    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: expect.objectContaining({ pendingProposalCount: 2 }),
      })
    );
  });

  it('swallows a 404 (investigation not found) rather than failing the decision request', async () => {
    const esClient = makeReadyEsClient(0);
    (esClient.update as jest.Mock).mockRejectedValue({ meta: { statusCode: 404 } });
    const store = new InvestigationStore(loggingSystemMock.createLogger());

    await expect(
      store.reconcileInvestigationAfterDecision(esClient, 'inv-missing')
    ).resolves.toBeUndefined();
  });
});

describe('InvestigationStore#getWatchActivityMetrics', () => {
  const makeReadyEsClient = (opts: {
    investigationBuckets?: Array<{ key: string; runs7d: number; lastRun: string | null }>;
    proposalBuckets?: Array<{ key: string; statuses: Record<string, number> }>;
  }) => {
    const search = jest.fn().mockImplementation(({ index }: { index: string }) => {
      if (index === 'pnd-investigations') {
        return Promise.resolve({
          aggregations: {
            by_watch: {
              buckets: (opts.investigationBuckets ?? []).map((b) => ({
                key: b.key,
                runs_7d: { doc_count: b.runs7d },
                last_run: { value_as_string: b.lastRun },
              })),
            },
          },
        });
      }
      return Promise.resolve({
        aggregations: {
          by_watch: {
            buckets: (opts.proposalBuckets ?? []).map((b) => ({
              key: b.key,
              by_status: {
                buckets: Object.entries(b.statuses).map(([key, doc_count]) => ({
                  key,
                  doc_count,
                })),
              },
            })),
          },
        },
      });
    });
    return {
      indices: {
        exists: jest.fn().mockResolvedValue(true),
        create: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        getMapping: jest.fn().mockResolvedValue({
          'pnd-investigations': { mappings: { _meta: { mappingsVersion: MAPPINGS_VERSION } } },
          'pnd-proposals': { mappings: { _meta: { mappingsVersion: MAPPINGS_VERSION } } },
          'pnd-evidence': { mappings: { _meta: { mappingsVersion: MAPPINGS_VERSION } } },
          'pnd-worker-evaluations': { mappings: { _meta: { mappingsVersion: MAPPINGS_VERSION } } },
          'pnd-canonical-proposals': {
            mappings: { _meta: { mappingsVersion: MAPPINGS_VERSION } },
          },
        }),
      },
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
      count: jest.fn().mockResolvedValue({ count: 0 }),
      search,
    } as unknown as Parameters<InvestigationStore['ensureReady']>[0] & { search: jest.Mock };
  };

  it('computes runs7d and lastRun from real investigation aggregations', async () => {
    const esClient = makeReadyEsClient({
      investigationBuckets: [
        { key: 'system-security-watch-floor', runs7d: 12, lastRun: '2026-07-27T10:00:00.000Z' },
      ],
    });
    const store = new InvestigationStore(loggingSystemMock.createLogger());

    const result = await store.getWatchActivityMetrics(esClient, ['system-security-watch-floor']);

    expect(result['system-security-watch-floor']).toEqual({
      runs7d: 12,
      acceptedPct: null,
      lastRun: '2026-07-27T10:00:00.000Z',
    });
  });

  it('computes acceptedPct as approved+executed over decided (excluding pending/escalated/deferred)', async () => {
    const esClient = makeReadyEsClient({
      proposalBuckets: [
        {
          key: 'system-security-watch-deep',
          statuses: { approved: 6, executed: 2, dismissed: 2, pending: 5, escalated: 3 },
        },
      ],
    });
    const store = new InvestigationStore(loggingSystemMock.createLogger());

    const result = await store.getWatchActivityMetrics(esClient, ['system-security-watch-deep']);

    // decided = approved(6) + executed(2) + dismissed(2) = 10; accepted = 8 -> 80%
    expect(result['system-security-watch-deep'].acceptedPct).toBe(80);
  });

  it('reports null (not 0%) acceptedPct when a watch has zero decided proposals', async () => {
    const esClient = makeReadyEsClient({
      proposalBuckets: [
        { key: 'system-security-watch-officer', statuses: { pending: 4, escalated: 1 } },
      ],
    });
    const store = new InvestigationStore(loggingSystemMock.createLogger());

    const result = await store.getWatchActivityMetrics(esClient, ['system-security-watch-officer']);

    expect(result['system-security-watch-officer'].acceptedPct).toBeNull();
  });

  it('defaults every requested watch id to all-null metrics before merging aggregation results', async () => {
    const esClient = makeReadyEsClient({});
    const store = new InvestigationStore(loggingSystemMock.createLogger());

    const result = await store.getWatchActivityMetrics(esClient, [
      'system-security-watch-ad',
      'system-security-watch-dark',
    ]);

    expect(result).toEqual({
      'system-security-watch-ad': { runs7d: null, acceptedPct: null, lastRun: null },
      'system-security-watch-dark': { runs7d: null, acceptedPct: null, lastRun: null },
    });
  });

  it('short-circuits with an empty object and issues no ES calls for an empty watch id list', async () => {
    const esClient = makeReadyEsClient({});
    const store = new InvestigationStore(loggingSystemMock.createLogger());

    const result = await store.getWatchActivityMetrics(esClient, []);

    expect(result).toEqual({});
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
