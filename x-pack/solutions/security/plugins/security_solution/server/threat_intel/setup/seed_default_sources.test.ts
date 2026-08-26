/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { DEFAULT_SOURCES, seedDefaultSources } from './seed_default_sources';

/**
 * The counts this returns drive bootstrap's retry decision: a non-zero `failed` makes
 * `seedThreatIntelCatalog` throw so the whole seed is retried. So reporting a failed
 * create as skipped, or vice versa, either hides missing default sources for the
 * lifetime of the process or retries forever. The bootstrap suite mocks this module
 * out, so none of that accounting was covered.
 */
const TOTAL = DEFAULT_SOURCES.length;

const run = async (bulkImpl: unknown) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  (esClient.bulk as unknown as jest.Mock).mockImplementation(bulkImpl as never);
  const logger = loggingSystemMock.createLogger();
  const result = await seedDefaultSources({ esClient, logger });
  return { esClient, result, logger };
};

/** Bulk response where every item takes the same shape. */
const itemsFor = (operations: unknown[], item: Record<string, unknown>) => {
  // Two entries per document: the action line and the source.
  const count = (operations as unknown[]).length / 2;
  return {
    errors: Object.keys(item)[0] === 'error',
    items: Array.from({ length: count }, () => ({ create: item })),
  };
};

/**
 * Seeding runs on every boot and the steady state is every source conflicting, so an
 * unconditional info log reports `0 created, N skipped` forever. bootstrap downgrades the
 * all-conflicts *result* to debug, but that cannot suppress a log this function already
 * emitted, so the level has to be decided here.
 */
describe('seedDefaultSources completion log level', () => {
  const summaryOf = (calls: unknown[][]) =>
    calls.map(([msg]) => String(msg)).filter((msg) => msg.startsWith('Default source seeding'));

  it('logs the steady state at debug, not info', async () => {
    const { logger } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { error: { status: 409 } })
    );

    expect(summaryOf(logger.info.mock.calls)).toEqual([]);
    expect(summaryOf(logger.debug.mock.calls)).toEqual([
      `Default source seeding finished: 0 created, ${TOTAL} skipped, 0 failed`,
    ]);
  });

  it('logs at info when sources were actually created', async () => {
    const { logger } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    expect(summaryOf(logger.info.mock.calls)).toEqual([
      `Default source seeding finished: ${TOTAL} created, 0 skipped, 0 failed`,
    ]);
  });

  it('logs at info when a source failed', async () => {
    const { logger } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { error: { type: 'mapper_parsing_exception' } })
    );

    expect(summaryOf(logger.info.mock.calls)).toEqual([
      `Default source seeding finished: 0 created, 0 skipped, ${TOTAL} failed`,
    ]);
  });
});

describe('seedDefaultSources', () => {
  it('counts every created document', async () => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    expect(result).toEqual({ total: TOTAL, created: TOTAL, skipped: 0, failed: 0 });
  });

  // The idempotency contract. Seeding runs on every boot, so the steady state is every
  // document conflicting, and that must not read as failure or bootstrap retries forever.
  it.each([
    ['version_conflict_engine_exception by type', { type: 'version_conflict_engine_exception' }],
    ['a 409 status', { status: 409 }],
  ])('treats %s as already present, not a failure', async (_label, error) => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { error })
    );

    expect(result.skipped).toBe(TOTAL);
    expect(result.failed).toBe(0);
    expect(result.created).toBe(0);
  });

  // A non-conflict item error has to surface as failed, because that is what makes
  // bootstrap retry rather than resolving readiness with sources missing.
  it('counts a non-conflict item error as failed', async () => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { error: { type: 'strict_dynamic_mapping_exception' } })
    );

    expect(result.failed).toBe(TOTAL);
    expect(result.skipped).toBe(0);
  });

  it('counts a missing create action on an item as failed', async () => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) => ({
      errors: true,
      items: Array.from({ length: (operations as unknown[]).length / 2 }, () => ({})),
    }));

    expect(result.failed).toBe(TOTAL);
  });

  it('counts every document in the chunk as failed when the whole bulk rejects', async () => {
    const { result } = await run(async () => {
      throw new Error('cluster_block_exception');
    });

    expect(result.failed).toBe(TOTAL);
    expect(result.created).toBe(0);
  });

  it('reports a mixed outcome accurately', async () => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) => {
      const count = (operations as unknown[]).length / 2;
      return {
        errors: true,
        items: Array.from({ length: count }, (_v, i) => {
          if (i === 0) return { create: { result: 'created' } };
          if (i === 1) return { create: { error: { type: 'version_conflict_engine_exception' } } };
          return { create: { error: { type: 'illegal_argument_exception' } } };
        }),
      };
    });

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(TOTAL - 2);
    expect(result.created + result.skipped + result.failed).toBe(TOTAL);
  });

  it('creates by stable id so a re-run cannot duplicate', async () => {
    const { esClient } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    const operations = (esClient.bulk as unknown as jest.Mock).mock.calls[0][0].operations as Array<
      Record<string, { _id?: string }>
    >;
    const ids = operations.filter((op) => op.create).map((op) => op.create._id);

    expect(ids).toHaveLength(TOTAL);
    expect(new Set(ids).size).toBe(TOTAL);
    expect(ids.every(Boolean)).toBe(true);
  });

  it('does not force a refresh, since nothing reads the catalog synchronously after', async () => {
    const { esClient } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    expect((esClient.bulk as unknown as jest.Mock).mock.calls[0][0].refresh).toBe(false);
  });

  it('accounts for every document exactly once', async () => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    expect(result.created + result.skipped + result.failed).toBe(result.total);
  });
});
