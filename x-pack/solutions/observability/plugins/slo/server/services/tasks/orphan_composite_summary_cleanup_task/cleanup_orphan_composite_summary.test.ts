/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchClientMock,
  type ElasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../../common/constants';
import { buildCompositeSloSummaryDocId } from '../../composites/composite_slo_summary_index';
import { cleanupOrphanCompositeSummaries } from './cleanup_orphan_composite_summary';

const createMockAggregationResponse = (
  buckets: Array<{ key: { spaceId: string; compositeId: string } }>,
  afterKey?: { spaceId: string; compositeId: string }
) =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    aggregations: {
      space_composite: {
        buckets,
        ...(afterKey ? { after_key: afterKey } : {}),
      },
    },
  } as any);

describe('cleanupOrphanCompositeSummaries', () => {
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

  it('should do nothing when composite summary index is empty', async () => {
    esClient.search.mockResolvedValueOnce(createMockAggregationResponse([]));

    const result = await cleanupOrphanCompositeSummaries(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(soClient.find).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('should not delete when all summaries have matching composite SOs', async () => {
    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse([
        { key: { spaceId: 'default', compositeId: 'c-1' } },
        { key: { spaceId: 'space-a', compositeId: 'c-2' } },
      ])
    );

    soClient.find
      .mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-1', attributes: { id: 'c-1' } }],
        page: 1,
        per_page: 1,
      } as any)
      .mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-2', attributes: { id: 'c-2' } }],
        page: 1,
        per_page: 1,
      } as any);

    const result = await cleanupOrphanCompositeSummaries(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(soClient.find).toHaveBeenCalledTimes(2);
    expect(soClient.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ namespaces: ['default'], perPage: 1 })
    );
    expect(soClient.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ namespaces: ['space-a'], perPage: 1 })
    );
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('should delete orphan summaries whose composite SO is missing', async () => {
    esClient.search.mockResolvedValueOnce(
      createMockAggregationResponse([
        { key: { spaceId: 'default', compositeId: 'c-keep' } },
        { key: { spaceId: 'default', compositeId: 'c-del' } },
      ])
    );

    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-keep', attributes: { id: 'c-keep' } }],
      page: 1,
      per_page: 2,
    } as any);

    const orphanId = buildCompositeSloSummaryDocId('default', 'c-del');

    const result = await cleanupOrphanCompositeSummaries(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(soClient.find).toHaveBeenCalledTimes(1);
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      {
        index: COMPOSITE_SUMMARY_INDEX_NAME,
        allow_no_indices: true,
        ignore_unavailable: true,
        wait_for_completion: false,
        conflicts: 'proceed',
        slices: 'auto',
        query: {
          ids: {
            values: [orphanId],
          },
        },
      },
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('should complete gracefully when composite summary index responds with HTTP 404', async () => {
    const notFoundErr = Object.assign(new Error('index missing'), {
      meta: { statusCode: 404 },
    });

    esClient.search.mockRejectedValueOnce(notFoundErr);

    const result = await cleanupOrphanCompositeSummaries(
      {},
      { esClient, soClient: soClient as any, logger, abortController }
    );

    expect(result).toEqual({ aborted: false, completed: true });
    expect(soClient.find).not.toHaveBeenCalled();
  });

  it('should propagate network errors during search', async () => {
    esClient.search.mockRejectedValueOnce(new Error('network'));

    await expect(
      cleanupOrphanCompositeSummaries(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      )
    ).rejects.toThrow('network');
  });
});
