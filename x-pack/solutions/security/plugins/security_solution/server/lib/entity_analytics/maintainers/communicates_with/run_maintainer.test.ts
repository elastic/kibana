/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { runMaintainer } from './run_maintainer';
import { COMPOSITE_PAGE_SIZE, MAX_ITERATIONS } from './constants';
import type { CompositeAfterKey, ProcessedEntityRecord } from './types';
import type { CommunicatesWithIntegrationConfig } from './integrations';

const mockPostprocessEsqlResults = jest.fn((): ProcessedEntityRecord[] => []);
const mockUpdateEntityRelationships = jest.fn(() => Promise.resolve(0));

jest.mock('./postprocess_records', () => ({
  postProcessEsqlResults: (...args: Parameters<typeof mockPostprocessEsqlResults>) =>
    mockPostprocessEsqlResults(...args),
}));

jest.mock('./update_entities', () => ({
  updateEntityRelationships: (...args: Parameters<typeof mockUpdateEntityRelationships>) =>
    mockUpdateEntityRelationships(...args),
}));

function createMockIntegration(
  overrides?: Partial<CommunicatesWithIntegrationConfig>
): CommunicatesWithIntegrationConfig {
  return {
    id: 'test_integration',
    name: 'Test Integration',
    entityType: 'user',
    getIndexPattern: jest.fn((ns: string) => `test-index-${ns}`),
    buildCompositeAggQuery: jest.fn((): Record<string, unknown> => ({ size: 0, aggs: {} })),
    buildBucketUserFilter: jest.fn(() => ({
      bool: { should: [], minimum_should_match: 1 },
    })),
    buildEsqlQuery: jest.fn(() => 'FROM test | STATS count = COUNT(*)'),
    ...overrides,
  };
}

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

describe('communicates_with runMaintainer', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const crudClient = {
    bulkUpdateEntity: jest.fn(),
    updateEntity: jest.fn(),
  } as unknown as EntityUpdateClient;
  let mockIntegration: CommunicatesWithIntegrationConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIntegration = createMockIntegration();
    mockPostprocessEsqlResults.mockReturnValue([]);
    mockUpdateEntityRelationships.mockResolvedValue(0);
  });

  describe('pagination', () => {
    it('stops after a single page when buckets < COMPOSITE_PAGE_SIZE', async () => {
      const buckets = [createBucket('user-1'), createBucket('user-2')];
      esClient.search.mockResolvedValueOnce(createAggResponse(buckets, { 'user.id': 'user-2' }));
      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
      });

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

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
      });

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(mockIntegration.buildCompositeAggQuery).toHaveBeenNthCalledWith(1, undefined);
      expect(mockIntegration.buildCompositeAggQuery).toHaveBeenNthCalledWith(2, page1AfterKey);
      expect(result.totalBuckets).toBe(COMPOSITE_PAGE_SIZE + 1);
    });

    it('stops when composite returns empty buckets', async () => {
      esClient.search.mockResolvedValueOnce(createAggResponse([]));

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
      });

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

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
      });

      expect(esClient.search).toHaveBeenCalledTimes(MAX_ITERATIONS);
      expect(logger.warn).toHaveBeenCalledWith(
        `[test_integration] Reached MAX_ITERATIONS (${MAX_ITERATIONS}), stopping pagination`
      );
      expect(result.totalBuckets).toBe(COMPOSITE_PAGE_SIZE * MAX_ITERATIONS);
    });
  });

  describe('ES|QL query failure', () => {
    it('throws when ES|QL query fails', async () => {
      const buckets = [createBucket('user-1')];
      esClient.search.mockResolvedValueOnce(createAggResponse(buckets));

      const genericError = new Error('search_phase_execution_exception');
      esClient.esql.query.mockRejectedValueOnce(genericError);

      await expect(
        runMaintainer({
          esClient,
          logger,
          namespace: 'default',
          crudClient,
          integrations: [mockIntegration],
        })
      ).rejects.toThrow('search_phase_execution_exception');
    });
  });

  describe('record aggregation and update', () => {
    it('collects records across multiple pages and updates once at the end', async () => {
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
        {
          entityId: 'user-0',
          entityType: 'user',
          communicates_with: ['service:s3.amazonaws.com'],
        },
      ];
      const page2Records: ProcessedEntityRecord[] = [
        {
          entityId: 'user-last',
          entityType: 'user',
          communicates_with: ['service:Microsoft Teams'],
        },
      ];

      const esqlColumns: EsqlColumn[] = [
        { name: 'communicates_with', type: 'keyword' },
        { name: 'actorUserId', type: 'keyword' },
      ];
      esClient.esql.query
        .mockResolvedValueOnce(
          createEsqlResponse(esqlColumns, [['service:s3.amazonaws.com', 'user-0']]) as never
        )
        .mockResolvedValueOnce(
          createEsqlResponse(esqlColumns, [['service:Microsoft Teams', 'user-last']]) as never
        );

      mockPostprocessEsqlResults
        .mockReturnValueOnce(page1Records)
        .mockReturnValueOnce(page2Records);

      mockUpdateEntityRelationships.mockResolvedValue(2);

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
      });

      expect(mockUpdateEntityRelationships).toHaveBeenCalledTimes(1);
      expect(mockUpdateEntityRelationships).toHaveBeenCalledWith(crudClient, logger, [
        ...page1Records,
        ...page2Records,
      ]);
      expect(result.totalCommunicationRecords).toBe(2);
      expect(result.totalUpdated).toBe(2);
    });

    it('calls update with empty array when no records found', async () => {
      esClient.search.mockResolvedValueOnce(createAggResponse([]));

      await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
      });

      expect(mockUpdateEntityRelationships).toHaveBeenCalledWith(crudClient, logger, []);
    });
  });

  describe('multiple integrations', () => {
    it('processes each integration independently and merges records', async () => {
      const integration1 = createMockIntegration({ id: 'integration_1', name: 'Integration 1' });
      const integration2 = createMockIntegration({ id: 'integration_2', name: 'Integration 2' });

      const buckets1 = [createBucket('user-a')];
      const buckets2 = [createBucket('user-b')];

      esClient.search
        .mockResolvedValueOnce(createAggResponse(buckets1))
        .mockResolvedValueOnce(createAggResponse(buckets2));

      esClient.esql.query
        .mockResolvedValueOnce(createEsqlResponse() as never)
        .mockResolvedValueOnce(createEsqlResponse() as never);

      const records1: ProcessedEntityRecord[] = [
        {
          entityId: 'user-a',
          entityType: 'user',
          communicates_with: ['service:s3.amazonaws.com'],
        },
      ];
      const records2: ProcessedEntityRecord[] = [
        {
          entityId: 'user-b',
          entityType: 'user',
          communicates_with: ['host:JANE-MBP'],
        },
      ];

      mockPostprocessEsqlResults.mockReturnValueOnce(records1).mockReturnValueOnce(records2);
      mockUpdateEntityRelationships.mockResolvedValue(2);

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [integration1, integration2],
      });

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(integration1.buildCompositeAggQuery).toHaveBeenCalledTimes(1);
      expect(integration2.buildCompositeAggQuery).toHaveBeenCalledTimes(1);
      expect(mockUpdateEntityRelationships).toHaveBeenCalledWith(crudClient, logger, [
        ...records1,
        ...records2,
      ]);
      expect(result.totalBuckets).toBe(2);
      expect(result.totalCommunicationRecords).toBe(2);
    });

    it('continues to next integration when one returns empty buckets', async () => {
      const integration1 = createMockIntegration({ id: 'empty_int', name: 'Empty' });
      const integration2 = createMockIntegration({ id: 'data_int', name: 'Has Data' });

      esClient.search
        .mockResolvedValueOnce(createAggResponse([]))
        .mockResolvedValueOnce(createAggResponse([createBucket('user-1')]));

      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [integration1, integration2],
      });

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(integration1.buildEsqlQuery).not.toHaveBeenCalled();
      expect(integration2.buildEsqlQuery).toHaveBeenCalled();
      expect(result.totalBuckets).toBe(1);
    });
  });

  describe('composite aggregation failure', () => {
    it('skips integration when index does not exist', async () => {
      const indexNotFoundError = Object.assign(new Error('index_not_found_exception'), {
        meta: { body: { error: { type: 'index_not_found_exception' } } },
      });
      esClient.search.mockRejectedValueOnce(indexNotFoundError);

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
      });

      expect(result.totalBuckets).toBe(0);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('not found, skipping'));
    });

    it('continues to next integration after skipping one with missing index', async () => {
      const missingInt = createMockIntegration({ id: 'missing', name: 'Missing' });
      const existingInt = createMockIntegration({ id: 'existing', name: 'Existing' });

      const indexNotFoundError = Object.assign(new Error('index_not_found_exception'), {
        meta: { body: { error: { type: 'index_not_found_exception' } } },
      });
      esClient.search
        .mockRejectedValueOnce(indexNotFoundError)
        .mockResolvedValueOnce(createAggResponse([createBucket('user-1')]));
      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [missingInt, existingInt],
      });

      expect(result.totalBuckets).toBe(1);
      expect(missingInt.buildEsqlQuery).not.toHaveBeenCalled();
      expect(existingInt.buildEsqlQuery).toHaveBeenCalled();
    });

    it('throws on non-index_not_found errors', async () => {
      esClient.search.mockRejectedValueOnce(new Error('search_phase_execution_exception'));

      await expect(
        runMaintainer({
          esClient,
          logger,
          namespace: 'default',
          crudClient,
          integrations: [mockIntegration],
        })
      ).rejects.toThrow('search_phase_execution_exception');
    });
  });

  describe('return value', () => {
    it('returns expected state shape', async () => {
      const buckets = [createBucket('user-1')];
      esClient.search.mockResolvedValueOnce(createAggResponse(buckets));

      const records: ProcessedEntityRecord[] = [
        {
          entityId: 'user-1',
          entityType: 'user',
          communicates_with: ['service:s3.amazonaws.com'],
        },
      ];
      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);
      mockPostprocessEsqlResults.mockReturnValueOnce(records);
      mockUpdateEntityRelationships.mockResolvedValue(1);

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
      });

      expect(result).toEqual(
        expect.objectContaining({
          totalBuckets: 1,
          totalCommunicationRecords: 1,
          totalUpdated: 1,
          lastRunTimestamp: expect.any(String),
        })
      );
    });
  });

  describe('abort handling', () => {
    it('stops before processing any integration when signal is already aborted', async () => {
      const abortCtrl = new AbortController();
      abortCtrl.abort();

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
        abortController: abortCtrl,
      });

      expect(esClient.search).not.toHaveBeenCalled();
      expect(esClient.esql.query).not.toHaveBeenCalled();
      expect(result.totalBuckets).toBe(0);
    });

    it('stops pagination when aborted between pages', async () => {
      const abortCtrl = new AbortController();
      const fullPageBuckets = Array.from({ length: COMPOSITE_PAGE_SIZE }, (_, i) =>
        createBucket(`user-${i}`)
      );
      const afterKey: CompositeAfterKey = { 'user.id': 'user-last' };

      esClient.search.mockResolvedValueOnce(createAggResponse(fullPageBuckets, afterKey));
      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);

      // Abort after the first page completes
      mockPostprocessEsqlResults.mockImplementationOnce(() => {
        abortCtrl.abort();
        return [];
      });

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
        abortController: abortCtrl,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(result.totalBuckets).toBe(COMPOSITE_PAGE_SIZE);
    });

    it('skips remaining integrations when aborted after the first one', async () => {
      const abortCtrl = new AbortController();
      const integration1 = createMockIntegration({ id: 'int_1', name: 'First' });
      const integration2 = createMockIntegration({ id: 'int_2', name: 'Second' });

      esClient.search.mockResolvedValueOnce(createAggResponse([createBucket('user-1')]));
      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);

      mockPostprocessEsqlResults.mockImplementationOnce(() => {
        abortCtrl.abort();
        return [];
      });

      await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [integration1, integration2],
        abortController: abortCtrl,
      });

      expect(integration1.buildCompositeAggQuery).toHaveBeenCalled();
      expect(integration2.buildCompositeAggQuery).not.toHaveBeenCalled();
    });

    it('skips bulk update when aborted after collecting records', async () => {
      const abortCtrl = new AbortController();
      const records: ProcessedEntityRecord[] = [
        { entityId: 'user-1', entityType: 'user', communicates_with: ['service:s3'] },
      ];

      esClient.search.mockResolvedValueOnce(createAggResponse([createBucket('user-1')]));
      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);
      mockPostprocessEsqlResults.mockImplementationOnce(() => {
        abortCtrl.abort();
        return records;
      });

      const result = await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
        abortController: abortCtrl,
      });

      expect(mockUpdateEntityRelationships).not.toHaveBeenCalled();
      expect(result.totalUpdated).toBe(0);
    });

    it('passes abort signal to esClient.search as a transport option', async () => {
      const abortCtrl = new AbortController();
      esClient.search.mockResolvedValueOnce(createAggResponse([]));

      await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
        abortController: abortCtrl,
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.not.objectContaining({ signal: expect.anything() }),
        expect.objectContaining({ signal: abortCtrl.signal })
      );
    });

    it('passes abort signal to esClient.esql.query as a transport option', async () => {
      const abortCtrl = new AbortController();
      esClient.search.mockResolvedValueOnce(createAggResponse([createBucket('user-1')]));
      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);

      await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
        abortController: abortCtrl,
      });

      expect(esClient.esql.query).toHaveBeenCalledWith(
        expect.not.objectContaining({ signal: expect.anything() }),
        expect.objectContaining({ signal: abortCtrl.signal })
      );
    });
  });

  describe('integration config usage', () => {
    it('calls integration.getIndexPattern with the namespace', async () => {
      esClient.search.mockResolvedValueOnce(createAggResponse([]));

      await runMaintainer({
        esClient,
        logger,
        namespace: 'custom-ns',
        crudClient,
        integrations: [mockIntegration],
      });

      expect(mockIntegration.getIndexPattern).toHaveBeenCalledWith('custom-ns');
    });

    it('passes buckets to integration.buildBucketUserFilter', async () => {
      const buckets = [createBucket('user-1'), createBucket('user-2')];
      esClient.search.mockResolvedValueOnce(createAggResponse(buckets));
      esClient.esql.query.mockResolvedValueOnce(createEsqlResponse() as never);

      await runMaintainer({
        esClient,
        logger,
        namespace: 'default',
        crudClient,
        integrations: [mockIntegration],
      });

      expect(mockIntegration.buildBucketUserFilter).toHaveBeenCalledWith(buckets);
    });
  });
});
