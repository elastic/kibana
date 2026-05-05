/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { loggerMock } from '@kbn/logging-mocks';

import { runGenericMaintainer } from './run_relationship_maintainer';
import { COMPOSITE_PAGE_SIZE, MAX_ITERATIONS } from './constants';
import type { RelationshipIntegrationConfig } from './types';

interface SearchResponse {
  aggregations?: {
    users: {
      buckets: Array<{ key: Record<string, string | null>; doc_count: number }>;
      after_key?: Record<string, string | null>;
    };
  };
}

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

const makeEsClient = (): {
  esClient: ElasticsearchClient;
  search: jest.Mock<Promise<SearchResponse>>;
  esql: jest.Mock<Promise<EsqlResponse>>;
} => {
  const search = jest.fn<Promise<SearchResponse>, unknown[]>();
  const esql = jest.fn<Promise<EsqlResponse>, unknown[]>();
  const esClient = {
    search,
    esql: { query: esql },
  } as unknown as ElasticsearchClient;
  return { esClient, search, esql };
};

const makeCrudClient = (
  errors: Array<{ status: number }> = []
): { crudClient: EntityUpdateClient; bulkUpdate: jest.Mock } => {
  const bulkUpdate = jest.fn().mockResolvedValue(errors);
  const crudClient = { bulkUpdateEntity: bulkUpdate } as unknown as EntityUpdateClient;
  return { crudClient, bulkUpdate };
};

const baseConfig: RelationshipIntegrationConfig = {
  kind: 'bucketed',
  id: 'elastic_defend',
  name: 'Elastic Defend',
  indexPattern: (ns) => `logs-endpoint.events.security-${ns}`,
  relationshipType: 'accesses',
  targetEntityType: 'host',
  bucketTargetByThreshold: {
    threshold: 4,
    aboveThresholdRelationship: 'accesses_frequently',
    belowThresholdRelationship: 'accesses_infrequently',
  },
  requireTargetEntityIdExists: true,
  esqlWhereClause: 'event.action == "log_on" AND event.outcome == "success"',
};

const oktaConfig: RelationshipIntegrationConfig = {
  kind: 'standard',
  id: 'okta',
  name: 'Okta',
  indexPattern: (ns) => `logs-okta.system-${ns}`,
  relationshipType: 'communicates_with',
  targetEntityType: 'user',
  esqlWhereClause: 'user.target.email IS NOT NULL',
  targetEvalOverride: 'CONCAT("user:", user.target.email, "@okta")',
};

const successResponse = (
  buckets: Array<{ key: Record<string, string | null>; doc_count: number }>,
  afterKey?: Record<string, string | null>
): SearchResponse => ({
  aggregations: { users: { buckets, after_key: afterKey } },
});

const indexNotFoundError = (shape: 'meta' | 'body') => {
  const body = { error: { type: 'index_not_found_exception' } };
  return shape === 'meta' ? { meta: { body } } : { body };
};

const realEsError = () => new Error('cluster_block_exception: index read-only');

const aborted = () => {
  const ac = new AbortController();
  ac.abort();
  return ac;
};

describe('runGenericMaintainer', () => {
  it('returns zeros when no integrations are provided', async () => {
    const { esClient } = makeEsClient();
    const { crudClient, bulkUpdate } = makeCrudClient();
    const result = await runGenericMaintainer({
      esClient,
      logger: loggerMock.create(),
      namespace: 'default',
      crudClient,
      integrations: [],
    });
    expect(result.totalBuckets).toBe(0);
    expect(result.totalRecords).toBe(0);
    expect(result.totalWritten).toBe(0);
    expect(result.lastRunTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(bulkUpdate).not.toHaveBeenCalled();
  });

  it('returns an ISO 8601 lastRunTimestamp', async () => {
    const { esClient } = makeEsClient();
    const { crudClient } = makeCrudClient();
    const before = new Date().toISOString();
    const { lastRunTimestamp } = await runGenericMaintainer({
      esClient,
      logger: loggerMock.create(),
      namespace: 'default',
      crudClient,
      integrations: [],
    });
    const after = new Date().toISOString();
    expect(lastRunTimestamp >= before).toBe(true);
    expect(lastRunTimestamp <= after).toBe(true);
  });

  describe('composite-agg pagination loop', () => {
    it('terminates when buckets is empty', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient } = makeCrudClient();
      search.mockResolvedValueOnce(successResponse([]));
      const result = await runGenericMaintainer({
        esClient,
        logger: loggerMock.create(),
        namespace: 'default',
        crudClient,
        integrations: [baseConfig],
      });
      expect(result.totalBuckets).toBe(0);
      expect(esql).not.toHaveBeenCalled();
    });

    it('iterates pages until after_key is missing (canonical composite-agg termination)', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient } = makeCrudClient();
      const firstPage = Array.from({ length: COMPOSITE_PAGE_SIZE }, (_, i) => ({
        key: { 'user.name': `alice${i}` },
        doc_count: 1,
      }));
      // Last page omits after_key — that's the contract that terminates the loop.
      const lastPage = [{ key: { 'user.name': 'bob' }, doc_count: 1 }];
      search
        .mockResolvedValueOnce(successResponse(firstPage, { 'user.name': 'after' }))
        .mockResolvedValueOnce(successResponse(lastPage /* no after_key */));
      esql.mockResolvedValue({
        columns: [
          { name: 'actorUserId', type: 'keyword' },
          { name: 'accesses_frequently', type: 'keyword' },
          { name: 'accesses_infrequently', type: 'keyword' },
        ],
        values: [],
      });
      await runGenericMaintainer({
        esClient,
        logger: loggerMock.create(),
        namespace: 'default',
        crudClient,
        integrations: [baseConfig],
      });
      expect(search).toHaveBeenCalledTimes(2);
      expect(esql).toHaveBeenCalledTimes(2);
    });

    it('continues paginating when after_key is still present on a partial-size page', async () => {
      // Composite agg can return a partial-size page with after_key still set
      // (e.g. when a sub-aggregation filter drops bucket candidates). The
      // engine must trust after_key, not infer termination from page size.
      const { esClient, search, esql } = makeEsClient();
      const { crudClient } = makeCrudClient();
      const partialWithAfterKey = [
        { key: { 'user.name': 'alice' }, doc_count: 1 },
        { key: { 'user.name': 'bob' }, doc_count: 1 },
      ];
      const finalPage = [{ key: { 'user.name': 'carol' }, doc_count: 1 }];
      search
        .mockResolvedValueOnce(successResponse(partialWithAfterKey, { 'user.name': 'after' }))
        .mockResolvedValueOnce(successResponse(finalPage /* no after_key */));
      esql.mockResolvedValue({
        columns: [{ name: 'actorUserId', type: 'keyword' }],
        values: [],
      });
      await runGenericMaintainer({
        esClient,
        logger: loggerMock.create(),
        namespace: 'default',
        crudClient,
        integrations: [baseConfig],
      });
      // Two search calls because after_key was still set on the partial page.
      // (Old heuristic would have stopped after one because length < page size.)
      expect(search).toHaveBeenCalledTimes(2);
    });

    it('stops at MAX_ITERATIONS even when after_key keeps coming back', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient } = makeCrudClient();
      const fullPage = Array.from({ length: COMPOSITE_PAGE_SIZE }, (_, i) => ({
        key: { 'user.name': `alice${i}` },
        doc_count: 1,
      }));
      search.mockResolvedValue(successResponse(fullPage, { 'user.name': 'never-ends' }));
      esql.mockResolvedValue({ columns: [], values: [] });
      const logger = loggerMock.create();
      const result = await runGenericMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [baseConfig],
      });
      // search may have been called MAX_ITERATIONS or MAX_ITERATIONS+1 times
      // depending on the loop's stop point; the contract is that we stopped
      // somewhere around the limit and warned about it.
      expect(search.mock.calls.length).toBeGreaterThanOrEqual(MAX_ITERATIONS);
      expect(search.mock.calls.length).toBeLessThanOrEqual(MAX_ITERATIONS + 1);
      const warns = logger.warn.mock.calls.map((c) => c[0] as string);
      expect(warns.some((m) => m.includes(`MAX_ITERATIONS`))).toBe(true);
      expect(result.totalBuckets).toBeGreaterThanOrEqual(COMPOSITE_PAGE_SIZE * MAX_ITERATIONS);
    });
  });

  describe('error handling — composite agg (Step 1)', () => {
    it.each(['meta', 'body'] as const)(
      'detects index_not_found_exception via %s.body.error.type and skips integration without throwing',
      async (shape) => {
        const { esClient, search, esql } = makeEsClient();
        const { crudClient, bulkUpdate } = makeCrudClient();
        search.mockRejectedValueOnce(indexNotFoundError(shape));
        const logger = loggerMock.create();
        const result = await runGenericMaintainer({
          esClient,
          logger,
          namespace: 'default',
          crudClient,
          integrations: [baseConfig],
        });
        expect(result.totalBuckets).toBe(0);
        expect(esql).not.toHaveBeenCalled();
        expect(bulkUpdate).not.toHaveBeenCalled();
        const infos = logger.info.mock.calls.map((c) => c[0] as string);
        expect(infos.some((m) => m.includes('not found, skipping'))).toBe(true);
        expect(logger.error).not.toHaveBeenCalled();
      }
    );

    it('returns null (does not throw) when the abort signal fires during composite agg', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient, bulkUpdate } = makeCrudClient();
      const ac = new AbortController();
      search.mockImplementationOnce(async () => {
        ac.abort();
        throw new Error('aborted');
      });
      const logger = loggerMock.create();
      const result = await runGenericMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [baseConfig],
        abortController: ac,
      });
      expect(result.totalBuckets).toBe(0);
      expect(esql).not.toHaveBeenCalled();
      expect(bulkUpdate).not.toHaveBeenCalled();
      const infos = logger.info.mock.calls.map((c) => c[0] as string);
      expect(infos.some((m) => m.includes('Aborted during composite aggregation'))).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('throws on a real (non-aborted, non-index-not-found) ES error', async () => {
      const { esClient, search } = makeEsClient();
      const { crudClient } = makeCrudClient();
      search.mockRejectedValueOnce(realEsError());
      const logger = loggerMock.create();
      await expect(
        runGenericMaintainer({
          esClient,
          logger,
          namespace: 'default',
          crudClient,
          integrations: [baseConfig],
        })
      ).rejects.toThrow(/cluster_block/);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('error handling — ES|QL (Step 2)', () => {
    it('returns null when the abort signal fires during ES|QL', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient, bulkUpdate } = makeCrudClient();
      const ac = new AbortController();
      search.mockResolvedValueOnce(
        successResponse([{ key: { 'user.name': 'alice' }, doc_count: 1 }])
      );
      esql.mockImplementationOnce(async () => {
        ac.abort();
        throw new Error('aborted');
      });
      const logger = loggerMock.create();
      const result = await runGenericMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [baseConfig],
        abortController: ac,
      });
      expect(result.totalBuckets).toBe(1);
      expect(result.totalRecords).toBe(0);
      expect(bulkUpdate).not.toHaveBeenCalled();
      const infos = logger.info.mock.calls.map((c) => c[0] as string);
      expect(infos.some((m) => m.includes('Aborted during ES|QL query'))).toBe(true);
    });

    it('throws on a real ES|QL error, preventing partial-data writes', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient, bulkUpdate } = makeCrudClient();
      search.mockResolvedValueOnce(
        successResponse([{ key: { 'user.name': 'alice' }, doc_count: 1 }])
      );
      esql.mockRejectedValueOnce(new Error('parsing_exception: line 1, column 5'));
      const logger = loggerMock.create();
      await expect(
        runGenericMaintainer({
          esClient,
          logger,
          namespace: 'default',
          crudClient,
          integrations: [baseConfig],
        })
      ).rejects.toThrow(/parsing_exception/);
      expect(bulkUpdate).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    // Defense in depth: ES|QL responses are typed loosely on the client. A
    // partial-success response or future protocol change could omit the
    // `columns` / `values` arrays. Without a guard, parseTargetsPerActorRows
    // would crash in `.map` with a misleading TypeError.
    describe('response shape guard', () => {
      it('warns and skips the page when columns is not an array', async () => {
        const { esClient, search, esql } = makeEsClient();
        const { crudClient, bulkUpdate } = makeCrudClient();
        search.mockResolvedValueOnce(
          successResponse([{ key: { 'user.name': 'alice' }, doc_count: 1 }])
        );
        esql.mockResolvedValueOnce({ values: [['user:alice@corp']] } as unknown as EsqlResponse);
        const logger = loggerMock.create();
        const result = await runGenericMaintainer({
          esClient,
          logger,
          namespace: 'default',
          crudClient,
          integrations: [baseConfig],
        });
        expect(result.totalRecords).toBe(0);
        expect(bulkUpdate).not.toHaveBeenCalled();
        const warns = logger.warn.mock.calls.map((c) => c[0] as string);
        expect(warns.some((m) => m.includes('unexpected response shape'))).toBe(true);
      });

      it('warns and skips the page when values is not an array', async () => {
        const { esClient, search, esql } = makeEsClient();
        const { crudClient, bulkUpdate } = makeCrudClient();
        search.mockResolvedValueOnce(
          successResponse([{ key: { 'user.name': 'alice' }, doc_count: 1 }])
        );
        esql.mockResolvedValueOnce({
          columns: [{ name: 'actorUserId', type: 'keyword' }],
        } as unknown as EsqlResponse);
        const logger = loggerMock.create();
        const result = await runGenericMaintainer({
          esClient,
          logger,
          namespace: 'default',
          crudClient,
          integrations: [baseConfig],
        });
        expect(result.totalRecords).toBe(0);
        expect(bulkUpdate).not.toHaveBeenCalled();
        const warns = logger.warn.mock.calls.map((c) => c[0] as string);
        expect(warns.some((m) => m.includes('unexpected response shape'))).toBe(true);
      });

      it('does NOT throw when both columns and values are missing (the original crash mode)', async () => {
        const { esClient, search, esql } = makeEsClient();
        const { crudClient } = makeCrudClient();
        search.mockResolvedValueOnce(
          successResponse([{ key: { 'user.name': 'alice' }, doc_count: 1 }])
        );
        esql.mockResolvedValueOnce({} as unknown as EsqlResponse);
        await expect(
          runGenericMaintainer({
            esClient,
            logger: loggerMock.create(),
            namespace: 'default',
            crudClient,
            integrations: [baseConfig],
          })
        ).resolves.toBeDefined();
      });
    });
  });

  describe('abort handling — outer integration loop', () => {
    it('does not call any ES API when aborted before the first integration', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient, bulkUpdate } = makeCrudClient();
      const result = await runGenericMaintainer({
        esClient,
        logger: loggerMock.create(),
        namespace: 'default',
        crudClient,
        integrations: [baseConfig, oktaConfig],
        abortController: aborted(),
      });
      expect(search).not.toHaveBeenCalled();
      expect(esql).not.toHaveBeenCalled();
      expect(bulkUpdate).not.toHaveBeenCalled();
      expect(result.totalWritten).toBe(0);
    });

    it('skips remaining integrations once aborted during the first one', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient, bulkUpdate } = makeCrudClient();
      const ac = new AbortController();
      // Integration #1: search returns a bucket, then ES|QL aborts the controller.
      search.mockResolvedValueOnce(
        successResponse([{ key: { 'user.name': 'alice' }, doc_count: 1 }])
      );
      esql.mockImplementationOnce(async () => {
        ac.abort();
        throw new Error('aborted');
      });
      // Integration #2 should never reach the ES client. If it does, this
      // unmocked call would return undefined and the test would crash with
      // a TypeError — making the regression highly visible.
      const result = await runGenericMaintainer({
        esClient,
        logger: loggerMock.create(),
        namespace: 'default',
        crudClient,
        integrations: [baseConfig, oktaConfig],
        abortController: ac,
      });
      expect(search).toHaveBeenCalledTimes(1); // only integration #1 ran
      expect(esql).toHaveBeenCalledTimes(1);
      expect(result.totalBuckets).toBe(1);
      expect(result.totalRecords).toBe(0);
      expect(bulkUpdate).not.toHaveBeenCalled();
    });

    it('skips the final write step when aborted after the last integration', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient, bulkUpdate } = makeCrudClient();
      const ac = new AbortController();
      // Integration completes one page, then we abort before the write.
      search.mockResolvedValueOnce(
        successResponse([{ key: { 'user.name': 'alice' }, doc_count: 1 }])
      );
      esql.mockImplementationOnce(async () => {
        ac.abort(); // abort during esql so the loop returns and the post-loop write check sees aborted
        throw new Error('aborted');
      });
      const logger = loggerMock.create();
      const result = await runGenericMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [baseConfig],
        abortController: ac,
      });
      expect(result.totalWritten).toBe(0);
      expect(bulkUpdate).not.toHaveBeenCalled();
      const infos = logger.info.mock.calls.map((c) => c[0] as string);
      expect(infos.some((m) => m.includes('skipping entity id write'))).toBe(true);
    });
  });

  describe('aggregation across integrations and pages', () => {
    it('sums totalBuckets and totalRecords across all integrations and writes once at the end', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient, bulkUpdate } = makeCrudClient();
      // baseConfig: 2 buckets, 1 esql record.
      search.mockResolvedValueOnce(
        successResponse([
          { key: { 'user.name': 'alice' }, doc_count: 1 },
          { key: { 'user.name': 'bob' }, doc_count: 1 },
        ])
      );
      esql.mockResolvedValueOnce({
        columns: [
          { name: 'actorUserId', type: 'keyword' },
          { name: 'accesses_frequently', type: 'keyword' },
          { name: 'accesses_infrequently', type: 'keyword' },
        ],
        values: [['user:alice@corp', ['host:H1'], null]],
      });
      // oktaConfig: 1 bucket, 1 esql record.
      search.mockResolvedValueOnce(
        successResponse([{ key: { 'user.name': 'carol' }, doc_count: 1 }])
      );
      esql.mockResolvedValueOnce({
        columns: [
          { name: 'actorUserId', type: 'keyword' },
          { name: 'communicates_with', type: 'keyword' },
        ],
        values: [['user:carol@okta', ['user:dave@okta']]],
      });
      const result = await runGenericMaintainer({
        esClient,
        logger: loggerMock.create(),
        namespace: 'default',
        crudClient,
        integrations: [baseConfig, oktaConfig],
      });
      expect(result.totalBuckets).toBe(3);
      expect(result.totalRecords).toBe(2);
      expect(bulkUpdate).toHaveBeenCalledTimes(1);
      expect(result.totalWritten).toBe(2);
    });

    it('uses the configured indexPattern per integration', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient } = makeCrudClient();
      search.mockResolvedValue(successResponse([]));
      esql.mockResolvedValue({ columns: [], values: [] });
      await runGenericMaintainer({
        esClient,
        logger: loggerMock.create(),
        namespace: 'prod',
        crudClient,
        integrations: [baseConfig, oktaConfig],
      });
      const indexes = search.mock.calls.map((c) => (c[0] as { index: string }).index);
      expect(indexes).toEqual(['logs-endpoint.events.security-prod', 'logs-okta.system-prod']);
    });
  });

  describe('transport options', () => {
    it('does not pass an AbortSignal to the ES client when no abortController is provided', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient } = makeCrudClient();
      search.mockResolvedValueOnce(
        successResponse([{ key: { 'user.name': 'alice' }, doc_count: 1 }])
      );
      esql.mockResolvedValueOnce({ columns: [], values: [] });
      await runGenericMaintainer({
        esClient,
        logger: loggerMock.create(),
        namespace: 'default',
        crudClient,
        integrations: [baseConfig],
      });
      expect(search.mock.calls[0][1]).toBeUndefined();
      expect(esql.mock.calls[0][1]).toBeUndefined();
    });

    it('passes the AbortSignal to both search and esql.query when abortController is provided', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient } = makeCrudClient();
      search.mockResolvedValueOnce(
        successResponse([{ key: { 'user.name': 'alice' }, doc_count: 1 }])
      );
      esql.mockResolvedValueOnce({ columns: [], values: [] });
      const ac = new AbortController();
      await runGenericMaintainer({
        esClient,
        logger: loggerMock.create(),
        namespace: 'default',
        crudClient,
        integrations: [baseConfig],
        abortController: ac,
      });
      expect((search.mock.calls[0][1] as { signal: AbortSignal }).signal).toBe(ac.signal);
      expect((esql.mock.calls[0][1] as { signal: AbortSignal }).signal).toBe(ac.signal);
    });
  });

  describe('ES|QL request shape', () => {
    it('passes the @timestamp range and bucket-derived terms filter to esql.query', async () => {
      const { esClient, search, esql } = makeEsClient();
      const { crudClient } = makeCrudClient();
      search.mockResolvedValueOnce(
        successResponse([{ key: { 'user.name': 'alice' }, doc_count: 1 }])
      );
      esql.mockResolvedValueOnce({ columns: [], values: [] });
      await runGenericMaintainer({
        esClient,
        logger: loggerMock.create(),
        namespace: 'default',
        crudClient,
        integrations: [baseConfig],
      });
      const [esqlArg] = esql.mock.calls[0] as [
        { query: string; filter: { bool: { filter: unknown[] } } }
      ];
      const filterStr = JSON.stringify(esqlArg.filter);
      expect(filterStr).toContain('@timestamp');
      expect(filterStr).toContain('alice');
      expect(esqlArg.query).toContain('FROM logs-endpoint.events.security-default');
    });
  });
});
