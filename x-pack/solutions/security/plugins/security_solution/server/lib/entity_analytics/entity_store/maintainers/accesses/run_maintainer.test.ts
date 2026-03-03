/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { runMaintainer } from './run_maintainer';
import { COMPOSITE_PAGE_SIZE, MAX_ITERATIONS } from './constants';
import type { CompositeAfterKey, ProcessedEntityRecord } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockBuildCompositeAggQuery = jest.fn((): any => ({ size: 0, aggs: {} }));
const mockBuildBucketUserFilter = jest.fn(() => ({
  bool: { should: [], minimum_should_match: 1 },
}));
const mockBuildEsqlQuery = jest.fn(() => 'FROM test | STATS count = COUNT(*)');
const mockPostprocessEsqlResults = jest.fn((): ProcessedEntityRecord[] => []);
const mockUpsertEntityRelationships = jest.fn(() => Promise.resolve(0));

jest.mock('./build_composite_agg', () => ({
  buildCompositeAggQuery: (...args: Parameters<typeof mockBuildCompositeAggQuery>) =>
    mockBuildCompositeAggQuery(...args),
  buildBucketUserFilter: (...args: Parameters<typeof mockBuildBucketUserFilter>) =>
    mockBuildBucketUserFilter(...args),
}));

jest.mock('./build_esql_query', () => ({
  buildEsqlQuery: (...args: Parameters<typeof mockBuildEsqlQuery>) => mockBuildEsqlQuery(...args),
}));

jest.mock('./postprocess_records', () => ({
  postprocessEsqlResults: (...args: Parameters<typeof mockPostprocessEsqlResults>) =>
    mockPostprocessEsqlResults(...args),
}));

jest.mock('./upsert_entities', () => ({
  upsertEntityRelationships: (...args: Parameters<typeof mockUpsertEntityRelationships>) =>
    mockUpsertEntityRelationships(...args),
}));

function createBucket(userId: string): { key: CompositeAfterKey; doc_count: number } {
  return {
    key: { 'user.id': userId, 'user.name': null, 'user.email': null },
    doc_count: 1,
  };
}

function createAggResponse(
  buckets: Array<{ key: CompositeAfterKey; doc_count: number }>,
  afterKey?: CompositeAfterKey
): SearchResponse {
  return {
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { hits: [] },
    aggregations: {
      users: {
        buckets,
        after_key: afterKey,
      },
    },
  } as unknown as SearchResponse;
}

interface EsqlColumn {
  name: string;
  type: string;
}

function createEsqlResponse(columns: EsqlColumn[] = [], values: unknown[][] = []) {
  return { columns, values };
}

describe('runMaintainer', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildCompositeAggQuery.mockReturnValue({ size: 0, aggs: {} });
    mockBuildEsqlQuery.mockReturnValue('FROM test | STATS count = COUNT(*)');
    mockPostprocessEsqlResults.mockReturnValue([]);
    mockUpsertEntityRelationships.mockResolvedValue(0);
  });

  describe('pagination', () => {
    it('stops after a single page when buckets < COMPOSITE_PAGE_SIZE', async () => {
      const buckets = [createBucket('user-1'), createBucket('user-2')];
      esClient.search.mockResolvedValueOnce(createAggResponse(buckets, { 'user.id': 'user-2' }));
      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);

      const result = await runMaintainer({ esClient, logger, namespace: 'default' });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(result.totalBuckets).toBe(2);
    });

    it('paginates when buckets === COMPOSITE_PAGE_SIZE', async () => {
      const page1Buckets = Array.from({ length: COMPOSITE_PAGE_SIZE }, (_, i) =>
        createBucket(`user-${i}`)
      );
      const page1AfterKey: CompositeAfterKey = {
        'user.id': `user-${COMPOSITE_PAGE_SIZE - 1}`,
      };
      const page2Buckets = [createBucket('user-last')];

      esClient.search
        .mockResolvedValueOnce(createAggResponse(page1Buckets, page1AfterKey))
        .mockResolvedValueOnce(createAggResponse(page2Buckets));

      esClient.esql.query
        .mockResolvedValueOnce(createEsqlResponse() as never)
        .mockResolvedValueOnce(createEsqlResponse() as never);

      const result = await runMaintainer({ esClient, logger, namespace: 'default' });

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(mockBuildCompositeAggQuery).toHaveBeenNthCalledWith(1, undefined);
      expect(mockBuildCompositeAggQuery).toHaveBeenNthCalledWith(2, page1AfterKey);
      expect(result.totalBuckets).toBe(COMPOSITE_PAGE_SIZE + 1);
    });

    it('stops when composite returns empty buckets', async () => {
      esClient.search.mockResolvedValueOnce(createAggResponse([]));

      const result = await runMaintainer({ esClient, logger, namespace: 'default' });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.esql.query).not.toHaveBeenCalled();
      expect(result.totalBuckets).toBe(0);
    });
  });

  describe('MAX_ITERATIONS guard', () => {
    it('stops pagination after MAX_ITERATIONS', async () => {
      const fullPageBuckets = Array.from({ length: COMPOSITE_PAGE_SIZE }, (_, i) =>
        createBucket(`user-${i}`)
      );
      const afterKey: CompositeAfterKey = { 'user.id': 'user-last' };

      esClient.search.mockResolvedValue(createAggResponse(fullPageBuckets, afterKey));
      esClient.esql.query.mockResolvedValue(createEsqlResponse() as never);

      const result = await runMaintainer({ esClient, logger, namespace: 'default' });

      expect(esClient.search).toHaveBeenCalledTimes(MAX_ITERATIONS);
      expect(logger.warn).toHaveBeenCalledWith(
        `Reached MAX_ITERATIONS (${MAX_ITERATIONS}), stopping pagination`
      );
      expect(result.totalBuckets).toBe(COMPOSITE_PAGE_SIZE * MAX_ITERATIONS);
    });
  });

  describe('verification_exception retry', () => {
    it('retries ES|QL without entity fields on verification_exception', async () => {
      const buckets = [createBucket('user-1')];
      esClient.search.mockResolvedValueOnce(createAggResponse(buckets));

      const verificationError = new Error(
        'verification_exception: Unknown column [user.entity.id]'
      );
      esClient.esql.query
        .mockRejectedValueOnce(verificationError)
        .mockResolvedValueOnce(createEsqlResponse() as never);

      await runMaintainer({ esClient, logger, namespace: 'default' });

      expect(esClient.esql.query).toHaveBeenCalledTimes(2);
      expect(mockBuildEsqlQuery).toHaveBeenCalledWith('default', false);
      expect(mockBuildEsqlQuery).toHaveBeenCalledWith('default', true);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('verification_exception'));
    });

    it('keeps skipEntityFields=true for subsequent pages after retry', async () => {
      const page1Buckets = Array.from({ length: COMPOSITE_PAGE_SIZE }, (_, i) =>
        createBucket(`user-${i}`)
      );
      const page1AfterKey: CompositeAfterKey = {
        'user.id': `user-${COMPOSITE_PAGE_SIZE - 1}`,
      };
      const page2Buckets = [createBucket('user-last')];

      esClient.search
        .mockResolvedValueOnce(createAggResponse(page1Buckets, page1AfterKey))
        .mockResolvedValueOnce(createAggResponse(page2Buckets));

      const verificationError = new Error('verification_exception: Unknown column');
      esClient.esql.query
        .mockRejectedValueOnce(verificationError)
        .mockResolvedValueOnce(createEsqlResponse() as never)
        .mockResolvedValueOnce(createEsqlResponse() as never);

      await runMaintainer({ esClient, logger, namespace: 'default' });

      const buildEsqlCalls = mockBuildEsqlQuery.mock.calls;
      expect(buildEsqlCalls[0]).toEqual(['default', false]);
      expect(buildEsqlCalls[1]).toEqual(['default', true]);
      expect(buildEsqlCalls[2]).toEqual(['default', true]);
    });

    it('throws non-verification_exception errors', async () => {
      const buckets = [createBucket('user-1')];
      esClient.search.mockResolvedValueOnce(createAggResponse(buckets));

      const genericError = new Error('search_phase_execution_exception');
      esClient.esql.query.mockRejectedValueOnce(genericError);

      await expect(runMaintainer({ esClient, logger, namespace: 'default' })).rejects.toThrow(
        'search_phase_execution_exception'
      );
    });

    it('does not retry twice on repeated verification_exception', async () => {
      const buckets = [createBucket('user-1')];
      esClient.search.mockResolvedValueOnce(createAggResponse(buckets));

      const verificationError = new Error('verification_exception: Unknown column');
      esClient.esql.query
        .mockRejectedValueOnce(verificationError)
        .mockRejectedValueOnce(verificationError);

      await expect(runMaintainer({ esClient, logger, namespace: 'default' })).rejects.toThrow(
        'verification_exception'
      );

      expect(esClient.esql.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('record aggregation and upsert', () => {
    it('collects records across multiple pages and upserts once at the end', async () => {
      const page1Buckets = Array.from({ length: COMPOSITE_PAGE_SIZE }, (_, i) =>
        createBucket(`user-${i}`)
      );
      const page1AfterKey: CompositeAfterKey = {
        'user.id': `user-${COMPOSITE_PAGE_SIZE - 1}`,
      };
      const page2Buckets = [createBucket('user-last')];

      esClient.search
        .mockResolvedValueOnce(createAggResponse(page1Buckets, page1AfterKey))
        .mockResolvedValueOnce(createAggResponse(page2Buckets));

      const page1Records: ProcessedEntityRecord[] = [
        { entityId: 'user-0', accesses_frequently: ['host-a'], accesses_infrequently: [] },
      ];
      const page2Records: ProcessedEntityRecord[] = [
        { entityId: 'user-last', accesses_frequently: [], accesses_infrequently: ['host-b'] },
      ];

      const esqlColumns: EsqlColumn[] = [
        { name: 'accesses_frequently', type: 'keyword' },
        { name: 'accesses_infrequently', type: 'keyword' },
        { name: 'actorUserId', type: 'keyword' },
      ];
      esClient.esql.query
        .mockResolvedValueOnce(
          createEsqlResponse(esqlColumns, [['host-a', null, 'user-0']]) as never
        )
        .mockResolvedValueOnce(
          createEsqlResponse(esqlColumns, [[null, 'host-b', 'user-last']]) as never
        );

      mockPostprocessEsqlResults
        .mockReturnValueOnce(page1Records)
        .mockReturnValueOnce(page2Records);

      mockUpsertEntityRelationships.mockResolvedValue(2);

      const result = await runMaintainer({ esClient, logger, namespace: 'default' });

      expect(mockUpsertEntityRelationships).toHaveBeenCalledTimes(1);
      expect(mockUpsertEntityRelationships).toHaveBeenCalledWith(esClient, logger, 'default', [
        ...page1Records,
        ...page2Records,
      ]);
      expect(result.totalAccessRecords).toBe(2);
      expect(result.totalUpserted).toBe(2);
    });

    it('calls upsert with empty array when no records found', async () => {
      esClient.search.mockResolvedValueOnce(createAggResponse([]));

      await runMaintainer({ esClient, logger, namespace: 'default' });

      expect(mockUpsertEntityRelationships).toHaveBeenCalledWith(esClient, logger, 'default', []);
    });
  });

  describe('composite aggregation failure', () => {
    it('throws when composite aggregation fails', async () => {
      esClient.search.mockRejectedValueOnce(new Error('index_not_found_exception'));

      await expect(runMaintainer({ esClient, logger, namespace: 'default' })).rejects.toThrow(
        'index_not_found_exception'
      );
    });
  });

  describe('return value', () => {
    it('returns expected state shape', async () => {
      const buckets = [createBucket('user-1')];
      esClient.search.mockResolvedValueOnce(createAggResponse(buckets));

      const records: ProcessedEntityRecord[] = [
        { entityId: 'user-1', accesses_frequently: [], accesses_infrequently: ['host-a'] },
      ];
      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);
      mockPostprocessEsqlResults.mockReturnValueOnce(records);
      mockUpsertEntityRelationships.mockResolvedValue(1);

      const result = await runMaintainer({ esClient, logger, namespace: 'default' });

      expect(result).toEqual(
        expect.objectContaining({
          totalBuckets: 1,
          totalAccessRecords: 1,
          totalUpserted: 1,
          lastRunTimestamp: expect.any(String),
        })
      );
    });
  });
});
