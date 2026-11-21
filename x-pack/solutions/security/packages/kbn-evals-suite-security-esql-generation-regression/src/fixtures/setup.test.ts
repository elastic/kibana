/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import {
  countByKey,
  createdFixtureIndexNames,
  distinctValuesByKey,
  documentField,
  expectedFixtureDocumentCounts,
  fixtureDocumentsByIndex,
  goldFixtureCoverage,
  largestDistinctGroupSize,
  largestGroupSize,
  unseededFixtureIndices,
} from './corpus';
import { corpusThresholds, esqlFixtureDocumentRequests } from './documents';
import { logsIndexCreateRequest } from './indices';
import {
  cleanupEsqlFixtures,
  indexEsqlFixtureDocuments,
  setupEsqlFixtures,
  verifyEsqlFixtureDocuments,
} from './setup';

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

interface BulkEsClient {
  bulk: jest.Mock<Promise<unknown>, [unknown]>;
}

const makeBulkEsClient = (response: unknown): BulkEsClient => ({
  bulk: jest.fn().mockResolvedValue(response),
});

const makeCountEsClient = (counts: Map<string, number>) => ({
  count: jest.fn(async ({ index }: { index: string }) => ({ count: counts.get(index) ?? 0 })),
});

describe('indexEsqlFixtureDocuments', () => {
  it('indexes the whole corpus in a single bulk request', async () => {
    const esClient = makeBulkEsClient({ errors: false, items: [] });

    await indexEsqlFixtureDocuments({
      esClient: esClient as unknown as Parameters<typeof indexEsqlFixtureDocuments>[0]['esClient'],
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    const args = esClient.bulk.mock.calls[0][0] as { refresh: string; operations: unknown[] };
    expect(args.refresh).toBe('wait_for');
    // One action line per document, plus the document itself.
    expect(args.operations).toHaveLength(esqlFixtureDocumentRequests.length * 2);
  });

  it('fails on a rejected document instead of shipping a partial corpus', async () => {
    const esClient = makeBulkEsClient({
      errors: true,
      items: [
        { index: { error: { type: 'mapper_parsing_exception', reason: 'failed to parse' } } },
      ],
    });

    await expect(
      indexEsqlFixtureDocuments({
        esClient: esClient as unknown as Parameters<
          typeof indexEsqlFixtureDocuments
        >[0]['esClient'],
      })
    ).rejects.toThrow(/mapper_parsing_exception/);
  });
});

describe('setupEsqlFixtures', () => {
  const makeSetupEsClient = (counts: Map<string, number>) => ({
    indices: {
      create: jest.fn().mockResolvedValue({}),
      refresh: jest.fn().mockResolvedValue({}),
    },
    bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    count: jest.fn(async ({ index }: { index: string }) => ({ count: counts.get(index) ?? 0 })),
  });

  const runSetup = (esClient: ReturnType<typeof makeSetupEsClient>) =>
    setupEsqlFixtures({
      esClient: esClient as unknown as Parameters<typeof setupEsqlFixtures>[0]['esClient'],
      log: makeLog(),
    });

  it('creates, seeds and then verifies every fixture index', async () => {
    const esClient = makeSetupEsClient(expectedFixtureDocumentCounts());

    await runSetup(esClient);

    expect(esClient.indices.create).toHaveBeenCalledTimes(createdFixtureIndexNames.length);
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    // Verification is the step that catches an index created but left empty.
    expect(esClient.count.mock.calls.map(([args]) => args.index).sort()).toEqual(
      Array.from(expectedFixtureDocumentCounts().keys()).sort()
    );
  });

  it('fails the run when an index comes back empty', async () => {
    const counts = expectedFixtureDocumentCounts();
    counts.set(logsIndexCreateRequest.index, 0);

    await expect(runSetup(makeSetupEsClient(counts))).rejects.toThrow(
      /fixture corpus is not seeded as expected/
    );
  });
});

describe('verifyEsqlFixtureDocuments', () => {
  it('passes when every fixture index holds the documents the corpus seeds', async () => {
    const esClient = makeCountEsClient(expectedFixtureDocumentCounts());

    await expect(
      verifyEsqlFixtureDocuments({
        esClient: esClient as unknown as Parameters<
          typeof verifyEsqlFixtureDocuments
        >[0]['esClient'],
        log: makeLog(),
      })
    ).resolves.toBeUndefined();
  });

  // The defect this whole card exists for: an index created with mappings and
  // never seeded. Both empty result sets make the ES|QL Result Equivalence
  // evaluator score 1.0, so the suite has to fail here instead.
  it('fails when a fixture index holds no documents', async () => {
    const counts = expectedFixtureDocumentCounts();
    counts.set(logsIndexCreateRequest.index, 0);
    const esClient = makeCountEsClient(counts);

    await expect(
      verifyEsqlFixtureDocuments({
        esClient: esClient as unknown as Parameters<
          typeof verifyEsqlFixtureDocuments
        >[0]['esClient'],
        log: makeLog(),
      })
    ).rejects.toThrow(
      new RegExp(`${logsIndexCreateRequest.index.replace(/\./g, '\\.')} holds 0, expected`)
    );
  });

  it('fails when a fixture index holds fewer documents than the corpus seeds', async () => {
    const counts = expectedFixtureDocumentCounts();
    counts.set(logsIndexCreateRequest.index, 1);
    const esClient = makeCountEsClient(counts);

    await expect(
      verifyEsqlFixtureDocuments({
        esClient: esClient as unknown as Parameters<
          typeof verifyEsqlFixtureDocuments
        >[0]['esClient'],
        log: makeLog(),
      })
    ).rejects.toThrow(/holds 1, expected/);
  });
});

describe('fixture corpus', () => {
  it('seeds documents into every fixture index', () => {
    const unseeded = unseededFixtureIndices();

    if (unseeded.length > 0) {
      throw new Error(
        `${unseeded.length} of ${createdFixtureIndexNames.length} fixture indices hold no documents: ` +
          `${unseeded.join(
            ', '
          )}. Every gold query targeting one of them returns an empty result ` +
          'set, and the ES|QL Result Equivalence evaluator scores two empty result sets as 1.0 — ' +
          'see src/fixtures/documents.ts.'
      );
    }
  });

  it('gives every gold query that declares sources a seeded index to read from', () => {
    const coverage = goldFixtureCoverage();
    const withoutData = coverage.filter(
      ({ sources, seededIndices }) => sources.length > 0 && seededIndices.length === 0
    );

    if (withoutData.length > 0) {
      const detail = withoutData
        .map(
          ({ index, question, sources, matchedIndices }) =>
            `  #${index} ${question.slice(0, 72)}…\n    FROM ${sources.join(', ')} → matches [${
              matchedIndices.join(', ') || 'no fixture index'
            }]`
        )
        .join('\n');

      throw new Error(
        `${withoutData.length} of ${coverage.length} gold queries read from fixture indices with no ` +
          `documents, so their reference result set can only ever be empty:\n${detail}`
      );
    }
  });

  // The three counted golds need *more* documents than the threshold they
  // count, never just one matching document.
  it('seeds more documents than each count-filtered gold needs', () => {
    const logsDocuments = fixtureDocumentsByIndex().get(logsIndexCreateRequest.index) ?? [];
    const field = (name: string) => (document: Record<string, unknown>) =>
      String(documentField(document, name));

    expect(corpusThresholds.distinctDnsQuestionsPerDomain).toBeGreaterThan(5); // #17 `unique_queries > 5`
    expect(corpusThresholds.beaconingRequestsPerDomain).toBeGreaterThan(100); // #22 `domain_requests > 100`
    expect(corpusThresholds.failedLoginsPerSourceIp).toBeGreaterThan(5); // #29 `login_counts > 5`

    // #17 `count_distinct(dns.question.name) > 5` per registered domain.
    expect(
      largestDistinctGroupSize(
        distinctValuesByKey(
          logsDocuments,
          field('dns.question.registered_domain'),
          field('dns.question.name')
        )
      )
    ).toBeGreaterThan(5);

    // #22 `domain_requests > 100` per `source.ip` + `url.domain`.
    expect(
      largestGroupSize(
        countByKey(
          logsDocuments,
          (document) =>
            `${documentField(document, 'source.ip')}|${documentField(document, 'url.domain')}`
        )
      )
    ).toBeGreaterThan(100);

    // #29 `login_counts > 5` failed logins per `source.ip`.
    expect(
      largestGroupSize(
        countByKey(
          logsDocuments.filter(
            (document) => documentField(document, 'event.action') === 'failed_login'
          ),
          field('source.ip')
        )
      )
    ).toBeGreaterThan(5);
  });

  // Guards the guard: coverage is only useful if it flags a source no fixture
  // index serves — the shape of every candidate query that reaches for
  // telemetry the stack does not have.
  it('flags a gold whose sources no fixture index serves', () => {
    const [coverage] = goldFixtureCoverage([
      {
        input: { question: 'endpoint telemetry' },
        output: { query: 'FROM logs-endpoint.events.process-*\n| STATS count = COUNT(*)' },
      },
    ]);

    expect(coverage.sources).toEqual(['logs-endpoint.events.process-*']);
    expect(coverage.matchedIndices).toEqual([]);
    expect(coverage.seededIndices).toEqual([]);
  });
});
