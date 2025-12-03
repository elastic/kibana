/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
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
  let esClient: ReturnType<typeof elasticsearchClientMock.createClusterClient>['asInternalUser'];
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
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

    await cleanupOrphanSummaries({ esClient, soClient: soClient as any, logger, abortController });

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

    await cleanupOrphanSummaries({ esClient, soClient: soClient as any, logger, abortController });

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

    await cleanupOrphanSummaries({ esClient, soClient: soClient as any, logger, abortController });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
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
    });
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

    await cleanupOrphanSummaries({ esClient, soClient: soClient as any, logger, abortController });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
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
    });
  });

  it('should paginate through summaries using after_key', async () => {
    // Generate 1000 buckets for the first page (CHUNK_SIZE = 1000)
    // Include slo-orphan-1 as an orphan (no matching definition)
    const firstPageBuckets = Array.from({ length: 1000 }, (_, i) => ({
      key: { id: i === 0 ? 'slo-orphan-1' : `slo-${i}`, revision: 1 },
    }));

    // First batch with after_key indicating more results (full page triggers pagination)
    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse(firstPageBuckets, { id: 'slo-999', revision: 1 })
    );

    // Second batch without after_key (last page, fewer than CHUNK_SIZE)
    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse([
        { key: { id: 'slo-1000', revision: 1 } },
        { key: { id: 'slo-orphan-2', revision: 1 } }, // orphan
      ])
    );

    // First batch: return all except slo-orphan-1
    soClient.find.mockResolvedValueOnce({
      total: 999,
      saved_objects: firstPageBuckets
        .filter((b) => b.key.id !== 'slo-orphan-1')
        .map((b, i) => ({
          id: `so-${i}`,
          attributes: { id: b.key.id, revision: b.key.revision },
        })),
      page: 1,
      per_page: 1000,
    } as any);

    // Second batch: slo-1000 exists, slo-orphan-2 is orphan
    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-1000', attributes: { id: 'slo-1000', revision: 1 } }],
      page: 1,
      per_page: 2,
    } as any);

    await cleanupOrphanSummaries({ esClient, soClient: soClient as any, logger, abortController });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(soClient.find).toHaveBeenCalledTimes(2);
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(2);

    // First delete call for slo-orphan-1
    expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(1, {
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
    });

    // Second delete call for slo-orphan-2
    expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(2, {
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
    });
  });

  it('should pass the after_key to subsequent search calls', async () => {
    const afterKey = { id: 'slo-1000', revision: 1 };

    // Generate 1000 buckets to trigger pagination (CHUNK_SIZE = 1000)
    const fullPageBuckets = Array.from({ length: 1000 }, (_, i) => ({
      key: { id: `slo-${i + 1}`, revision: 1 },
    }));

    esClient.search
      .mockResolvedValueOnce(createMockAggregationResponse(fullPageBuckets, afterKey))
      .mockResolvedValueOnce(createMockAggregationResponse([]));

    // Return all definitions as existing (no orphans to delete)
    soClient.find.mockResolvedValueOnce({
      total: 1000,
      saved_objects: fullPageBuckets.map((b, i) => ({
        id: `so-${i + 1}`,
        attributes: { id: b.key.id, revision: b.key.revision },
      })),
      page: 1,
      per_page: 1000,
    } as any);

    await cleanupOrphanSummaries({ esClient, soClient: soClient as any, logger, abortController });

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

    await cleanupOrphanSummaries({ esClient, soClient: soClient as any, logger, abortController });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: abortController.signal })
    );
  });
});
