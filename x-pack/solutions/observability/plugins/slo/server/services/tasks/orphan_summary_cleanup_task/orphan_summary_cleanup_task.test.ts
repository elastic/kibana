/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  elasticsearchClientMock,
  type ElasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../../common/constants';
import { cleanupOrphanSummaries } from './cleanup_orphan_summary';

const createMockAggregationResponse = (
  buckets: Array<{ key: { id: string; revision: number } }>,
  afterKey?: { id: string; revision: number }
) =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    aggregations: {
      id_revision: {
        buckets,
        ...(afterKey ? { after_key: afterKey } : {}),
      },
    },
  } as any);

describe('cleanupOrphanSummaries', () => {
  let esClient: ElasticsearchClientMock;
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let logger: jest.Mocked<MockedLogger>;
  let abortController: AbortController;

  beforeEach(() => {
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
    soClient = savedObjectsClientMock.create();
    logger = loggerMock.create();
    abortController = new AbortController();
    jest.clearAllMocks();
  });

  it('should do nothing when summary index is empty', async () => {
    esClient.search.mockResolvedValueOnce(createMockAggregationResponse([]));

    const result = await cleanupOrphanSummaries(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(soClient.find).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('should not delete when all summaries have matching definitions', async () => {
    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse([
        { key: { id: 'slo-1', revision: 1 } },
        { key: { id: 'slo-2', revision: 1 } },
        { key: { id: 'slo-3', revision: 1 } },
      ])
    );

    soClient.find.mockResolvedValueOnce({
      total: 3,
      saved_objects: [
        { id: 'so-1', attributes: { id: 'slo-1', revision: 1 } },
        { id: 'so-2', attributes: { id: 'slo-2', revision: 1 } },
        { id: 'so-3', attributes: { id: 'slo-3', revision: 1 } },
      ],
      page: 1,
      per_page: 3,
    } as any);

    const result = await cleanupOrphanSummaries(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(soClient.find).toHaveBeenCalledTimes(1);
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('should delete orphan summaries with mismatched revisions', async () => {
    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse([
        { key: { id: 'slo-1', revision: 1 } },
        { key: { id: 'slo-2', revision: 1 } },
        { key: { id: 'slo-3', revision: 1 } }, // orphan: revision mismatch
        { key: { id: 'slo-3', revision: 2 } },
        { key: { id: 'slo-4', revision: 1 } }, // orphan: no definition
      ])
    );

    soClient.find.mockResolvedValueOnce({
      total: 3,
      saved_objects: [
        { id: 'so-1', attributes: { id: 'slo-1', revision: 1 } },
        { id: 'so-2', attributes: { id: 'slo-2', revision: 1 } },
        { id: 'so-3', attributes: { id: 'slo-3', revision: 2 } },
      ],
      page: 1,
      per_page: 5,
    } as any);

    const result = await cleanupOrphanSummaries(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      {
        index: SUMMARY_DESTINATION_INDEX_PATTERN,
        wait_for_completion: false,
        conflicts: 'proceed',
        slices: 'auto',
        query: {
          bool: {
            should: [
              {
                bool: {
                  must: [{ term: { 'slo.id': 'slo-3' } }, { term: { 'slo.revision': 1 } }],
                },
              },
              {
                bool: {
                  must: [{ term: { 'slo.id': 'slo-4' } }, { term: { 'slo.revision': 1 } }],
                },
              },
            ],
          },
        },
      },
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('should delete all summaries when no definitions exist', async () => {
    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse([
        { key: { id: 'slo-1', revision: 1 } },
        { key: { id: 'slo-2', revision: 1 } },
      ])
    );

    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 2,
    } as any);

    const result = await cleanupOrphanSummaries(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      {
        index: SUMMARY_DESTINATION_INDEX_PATTERN,
        wait_for_completion: false,
        conflicts: 'proceed',
        slices: 'auto',
        query: {
          bool: {
            should: [
              {
                bool: {
                  must: [{ term: { 'slo.id': 'slo-1' } }, { term: { 'slo.revision': 1 } }],
                },
              },
              {
                bool: {
                  must: [{ term: { 'slo.id': 'slo-2' } }, { term: { 'slo.revision': 1 } }],
                },
              },
            ],
          },
        },
      },
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('should paginate through summaries using after_key', async () => {
    // First batch with after_key indicating more results (full page triggers pagination)
    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse(
        [
          { key: { id: 'slo-orphan-1', revision: 1 } }, // orphan
          { key: { id: 'slo-1', revision: 1 } },
        ],
        { id: 'slo-1', revision: 1 }
      )
    );

    // Second batch without after_key (last page, fewer than chunkSize)
    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse([{ key: { id: 'slo-orphan-2', revision: 1 } }]) // orphan
    );

    // First batch: return only slo-1
    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-1', attributes: { id: 'slo-1', revision: 1 } }],
      page: 1,
      per_page: 2,
    } as any);

    // Second batch: no definitions found
    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 1,
    } as any);

    const result = await cleanupOrphanSummaries(
      { chunkSize: 2 },
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(soClient.find).toHaveBeenCalledTimes(2);
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(2);

    // First delete call for slo-orphan-1
    expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
      1,
      {
        index: SUMMARY_DESTINATION_INDEX_PATTERN,
        wait_for_completion: false,
        conflicts: 'proceed',
        slices: 'auto',
        query: {
          bool: {
            should: [
              {
                bool: {
                  must: [{ term: { 'slo.id': 'slo-orphan-1' } }, { term: { 'slo.revision': 1 } }],
                },
              },
            ],
          },
        },
      },
      expect.objectContaining({ signal: abortController.signal })
    );

    // Second delete call for slo-orphan-2
    expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
      2,
      {
        index: SUMMARY_DESTINATION_INDEX_PATTERN,
        wait_for_completion: false,
        conflicts: 'proceed',
        slices: 'auto',
        query: {
          bool: {
            should: [
              {
                bool: {
                  must: [{ term: { 'slo.id': 'slo-orphan-2' } }, { term: { 'slo.revision': 1 } }],
                },
              },
            ],
          },
        },
      },
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('should pass the after_key to subsequent search calls', async () => {
    const afterKey = { id: 'slo-2', revision: 1 };

    esClient.search
      .mockResolvedValueOnce(
        createMockAggregationResponse(
          [{ key: { id: 'slo-1', revision: 1 } }, { key: { id: 'slo-2', revision: 1 } }],
          afterKey
        )
      )
      .mockResolvedValueOnce(createMockAggregationResponse([]));

    // Return all definitions as existing (no orphans to delete)
    soClient.find.mockResolvedValueOnce({
      total: 2,
      saved_objects: [
        { id: 'so-1', attributes: { id: 'slo-1', revision: 1 } },
        { id: 'so-2', attributes: { id: 'slo-2', revision: 1 } },
      ],
      page: 1,
      per_page: 2,
    } as any);

    const result = await cleanupOrphanSummaries(
      { chunkSize: 2 },
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    // Second call should include the after_key
    expect(esClient.search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        aggs: expect.objectContaining({
          id_revision: expect.objectContaining({
            composite: expect.objectContaining({
              after: afterKey,
            }),
          }),
        }),
      }),
      expect.any(Object)
    );
  });

  it('should use abort controller signal in search calls', async () => {
    esClient.search.mockResolvedValueOnce(createMockAggregationResponse([]));

    await cleanupOrphanSummaries(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.search).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('should use abort controller signal in deleteByQuery calls', async () => {
    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse([{ key: { id: 'orphan-slo', revision: 1 } }])
    );

    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 1,
    } as any);

    await cleanupOrphanSummaries(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('should stop after maxRuns iterations and return aborted result with nextState', async () => {
    // Set up mock responses for 3 iterations with pagination
    esClient.search
      .mockResolvedValueOnce(
        createMockAggregationResponse([{ key: { id: 'slo-1', revision: 1 } }], {
          id: 'slo-1',
          revision: 1,
        })
      )
      .mockResolvedValueOnce(
        createMockAggregationResponse([{ key: { id: 'slo-2', revision: 1 } }], {
          id: 'slo-2',
          revision: 1,
        })
      )
      .mockResolvedValueOnce(
        createMockAggregationResponse([{ key: { id: 'slo-3', revision: 1 } }], {
          id: 'slo-3',
          revision: 1,
        })
      );

    // All definitions exist (no orphans to delete)
    soClient.find
      .mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-1', attributes: { id: 'slo-1', revision: 1 } }],
        page: 1,
        per_page: 1,
      } as any)
      .mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-2', attributes: { id: 'slo-2', revision: 1 } }],
        page: 1,
        per_page: 1,
      } as any);

    const result = await cleanupOrphanSummaries(
      { chunkSize: 1, maxRuns: 2 },
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({
      aborted: true,
      completed: false,
      nextState: { searchAfter: { id: 'slo-2', revision: 1 } },
    });
    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(soClient.find).toHaveBeenCalledTimes(2);
  });

  it('should resume from searchAfter state', async () => {
    const searchAfter = { id: 'slo-previous', revision: 1 };

    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse([{ key: { id: 'slo-next', revision: 1 } }])
    );

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-next', attributes: { id: 'slo-next', revision: 1 } }],
      page: 1,
      per_page: 1,
    } as any);

    const result = await cleanupOrphanSummaries(
      { searchAfter },
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        aggs: expect.objectContaining({
          id_revision: expect.objectContaining({
            composite: expect.objectContaining({
              after: searchAfter,
            }),
          }),
        }),
      }),
      expect.any(Object)
    );
  });

  it('should handle RequestAbortedError and preserve state', async () => {
    const searchAfter = { id: 'slo-1', revision: 1 };
    esClient.search.mockRejectedValueOnce(new errors.RequestAbortedError('Aborted'));

    const result = await cleanupOrphanSummaries(
      { searchAfter },
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({
      aborted: true,
      completed: false,
      nextState: { searchAfter },
    });
  });

  it('should handle other errors appropriately', async () => {
    esClient.search.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      cleanupOrphanSummaries({}, { esClient, soClient: soClient as any, logger, abortController })
    ).rejects.toThrow('Network error');
  });
});
