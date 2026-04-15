/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { TasksGetResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  elasticsearchClientMock,
  type ElasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import {
  DEFAULT_STALE_SLO_THRESHOLD_HOURS,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../../../common/constants';
import { sloSettingsObjectId } from '../../../saved_objects/slo_settings';
import { cleanupStaleInstances } from './cleanup_stale_instances';
import type { TaskState } from './types';

const createMockSpaceAggregationResponse = (
  buckets: Array<{ key: { spaceId: string } }>,
  afterKey?: { spaceId: string }
) =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    aggregations: {
      spaces: {
        buckets,
        ...(afterKey ? { after_key: afterKey } : {}),
      },
    },
  } as any);

const createMockSettingsResponse = (
  settings: Array<{
    id: string;
    error?: boolean;
    attributes?: {
      staleInstancesCleanupEnabled?: boolean;
      staleThresholdInHours?: number;
      useAllRemoteClusters?: boolean;
      selectedRemoteClusters?: string[];
    };
  }>
) => ({
  saved_objects: settings.map((s) =>
    s.error
      ? { id: s.id, error: { statusCode: 404, message: 'Not found' } }
      : {
          id: s.id,
          attributes: {
            useAllRemoteClusters: false,
            selectedRemoteClusters: [],
            ...s.attributes,
          },
        }
  ),
});

const createMockTaskResponse = (completed: boolean, runningTimeInNanos?: number) =>
  ({
    completed,
    task: {
      running_time_in_nanos: runningTimeInNanos ?? 0,
    },
  } as TasksGetResponse);

describe('cleanupStaleInstances', () => {
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

  describe('delete by query task state management', () => {
    it('should skip run when previous DBQ task is still running', async () => {
      esClient.tasks.get.mockResolvedValueOnce(createMockTaskResponse(false, 1000));

      const previousState: TaskState = { deleteTaskId: 'task-123', searchAfter: 'space-1' };
      const result = await cleanupStaleInstances(previousState, {
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(result.nextState).toEqual({ deleteTaskId: 'task-123', searchAfter: 'space-1' });
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('should cancel the DBQ task when it exceeds MAX_TASK_DURATION_NANOS', async () => {
      const maxDurationNanos = 24 * 60 * 60 * 1_000_000_000; // 24 hours in nanoseconds
      esClient.tasks.get.mockResolvedValueOnce(
        createMockTaskResponse(false, maxDurationNanos + 1000)
      );
      esClient.tasks.cancel.mockResolvedValueOnce({} as any);
      esClient.search.mockResolvedValueOnce(createMockSpaceAggregationResponse([]));

      const previousState: TaskState = { deleteTaskId: 'task-123' };

      await cleanupStaleInstances(previousState, {
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(esClient.tasks.cancel).toHaveBeenCalledWith(
        { task_id: 'task-123' },
        { signal: abortController.signal }
      );
    });

    it('should handle task 404 (assume completed)', async () => {
      const notFoundError = new Error('Task not found');
      (notFoundError as any).meta = { statusCode: 404 };
      esClient.tasks.get.mockRejectedValueOnce(notFoundError);
      esClient.search.mockResolvedValueOnce(createMockSpaceAggregationResponse([]));

      const previousState: TaskState = { deleteTaskId: 'task-123' };
      const result = await cleanupStaleInstances(previousState, {
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(result.nextState).toEqual({});
    });

    it('should handle task cancellation failure gracefully', async () => {
      const maxDurationNanos = 24 * 60 * 60 * 1_000_000_000; // 24 hours in nanoseconds
      esClient.tasks.get.mockResolvedValueOnce(
        createMockTaskResponse(false, maxDurationNanos + 1000)
      );
      esClient.tasks.cancel.mockRejectedValueOnce(new Error('Cancel failed'));
      esClient.search.mockResolvedValueOnce(createMockSpaceAggregationResponse([]));

      const previousState: TaskState = { deleteTaskId: 'task-123' };
      const result = await cleanupStaleInstances(previousState, {
        esClient,
        soClient: soClient as any,
        logger,
        abortController,
      });

      expect(result.nextState).toEqual({});
    });
  });

  describe('space batch processing', () => {
    it('should do nothing when no spaces in summary index', async () => {
      esClient.search.mockResolvedValueOnce(createMockSpaceAggregationResponse([]));

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(result.nextState).toEqual({});
      expect(soClient.bulkGet).not.toHaveBeenCalled();
    });

    it('should process single batch of spaces with stale documents', async () => {
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse([{ key: { spaceId: 'space-1' } }])
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse([
          {
            id: sloSettingsObjectId('space-1'),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 48 },
          },
        ]) as any
      );
      esClient.count.mockResolvedValueOnce({ count: 10 } as any);
      esClient.deleteByQuery.mockResolvedValueOnce({ task: 'delete-task-1' } as any);

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(result.nextState).toEqual({ deleteTaskId: 'delete-task-1' });
    });

    it('should handle pagination through multiple space batches', async () => {
      // First batch: no stale documents, has after_key
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse(
          Array.from({ length: 100 }, (_, i) => ({ key: { spaceId: `space-${i}` } })),
          { spaceId: 'space-99' }
        )
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse(
          Array.from({ length: 100 }, (_, i) => ({
            id: sloSettingsObjectId(`space-${i}`),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 48 },
          }))
        ) as any
      );
      esClient.count.mockResolvedValueOnce({ count: 0 } as any);

      // Second batch: has stale documents
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse([{ key: { spaceId: 'space-100' } }])
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse([
          {
            id: sloSettingsObjectId('space-100'),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 24 },
          },
        ]) as any
      );
      esClient.count.mockResolvedValueOnce({ count: 5 } as any);
      esClient.deleteByQuery.mockResolvedValueOnce({ task: 'delete-task-2' } as any);

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(result.nextState).toEqual({ deleteTaskId: 'delete-task-2' });
    });

    it('should reset cursor when reaching end of spaces (partial batch)', async () => {
      // Partial batch (less than SPACES_PER_BATCH=100)
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse([
          { key: { spaceId: 'space-1' } },
          { key: { spaceId: 'space-2' } },
        ])
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse([
          {
            id: sloSettingsObjectId('space-1'),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 48 },
          },
          {
            id: sloSettingsObjectId('space-2'),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 48 },
          },
        ]) as any
      );
      esClient.count.mockResolvedValueOnce({ count: 3 } as any);
      esClient.deleteByQuery.mockResolvedValueOnce({ task: 'delete-task-3' } as any);

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      // searchAfter should be undefined (reset) since it's the last batch
      expect(result.nextState).toEqual({ deleteTaskId: 'delete-task-3' });
    });

    it('should stop after MAX_BATCHES_PER_RUN iterations without stale documents', async () => {
      // Create 10 batches worth of responses, all without stale documents
      for (let i = 0; i < 10; i++) {
        esClient.search.mockResolvedValueOnce(
          createMockSpaceAggregationResponse(
            Array.from({ length: 100 }, (_, j) => ({
              key: { spaceId: `space-${i * 100 + j}` },
            })),
            { spaceId: `space-${(i + 1) * 100 - 1}` }
          )
        );
        soClient.bulkGet.mockResolvedValueOnce(
          createMockSettingsResponse(
            Array.from({ length: 100 }, (_, j) => ({
              id: sloSettingsObjectId(`space-${i * 100 + j}`),
              attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 48 },
            }))
          ) as any
        );
        esClient.count.mockResolvedValueOnce({ count: 0 } as any);
      }

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.search).toHaveBeenCalledTimes(10);
      expect(result.nextState).toEqual({ searchAfter: 'space-999' });
    });

    it('should resume from searchAfter state', async () => {
      esClient.search.mockResolvedValueOnce(createMockSpaceAggregationResponse([]));

      await cleanupStaleInstances(
        { searchAfter: 'previous-space' },
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          aggs: expect.objectContaining({
            spaces: expect.objectContaining({
              composite: expect.objectContaining({
                after: { spaceId: 'previous-space' },
              }),
            }),
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('settings handling', () => {
    it('should skip spaces with cleanup disabled', async () => {
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse([
          { key: { spaceId: 'space-1' } },
          { key: { spaceId: 'space-2' } },
        ])
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse([
          {
            id: sloSettingsObjectId('space-1'),
            attributes: { staleInstancesCleanupEnabled: false },
          },
          {
            id: sloSettingsObjectId('space-2'),
            attributes: { staleInstancesCleanupEnabled: false },
          },
        ]) as any
      );

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.count).not.toHaveBeenCalled();
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      expect(result.nextState).toEqual({});
    });

    it('should skip spaces with missing settings', async () => {
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse([{ key: { spaceId: 'space-1' } }])
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse([{ id: sloSettingsObjectId('space-1'), error: true }]) as any
      );

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.count).not.toHaveBeenCalled();
      expect(result.nextState).toEqual({});
    });

    it('should use default threshold when staleThresholdInHours is missing', async () => {
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse([{ key: { spaceId: 'space-1' } }])
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse([
          {
            id: sloSettingsObjectId('space-1'),
            attributes: { staleInstancesCleanupEnabled: true },
          },
        ]) as any
      );
      esClient.count.mockResolvedValueOnce({ count: 1 } as any);
      esClient.deleteByQuery.mockResolvedValueOnce({ task: 'task-1' } as any);

      await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining([
                expect.objectContaining({
                  bool: expect.objectContaining({
                    filter: expect.arrayContaining([
                      { terms: { spaceId: ['space-1'] } },
                      {
                        range: {
                          summaryUpdatedAt: { lt: `now-${DEFAULT_STALE_SLO_THRESHOLD_HOURS}h` },
                        },
                      },
                    ]),
                  }),
                }),
              ]),
            }),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should process spaces with different threshold hours', async () => {
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse([
          { key: { spaceId: 'space-1' } },
          { key: { spaceId: 'space-2' } },
          { key: { spaceId: 'space-3' } },
        ])
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse([
          {
            id: sloSettingsObjectId('space-1'),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 24 },
          },
          {
            id: sloSettingsObjectId('space-2'),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 24 },
          },
          {
            id: sloSettingsObjectId('space-3'),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 72 },
          },
        ]) as any
      );
      esClient.count.mockResolvedValueOnce({ count: 5 } as any);
      esClient.deleteByQuery.mockResolvedValueOnce({ task: 'task-1' } as any);

      await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              should: expect.arrayContaining([
                {
                  bool: {
                    filter: [
                      { terms: { spaceId: ['space-1', 'space-2'] } },
                      { range: { summaryUpdatedAt: { lt: 'now-24h' } } },
                    ],
                  },
                },
                {
                  bool: {
                    filter: [
                      { terms: { spaceId: ['space-3'] } },
                      { range: { summaryUpdatedAt: { lt: 'now-72h' } } },
                    ],
                  },
                },
              ]),
              minimum_should_match: 1,
            },
          },
        }),
        expect.any(Object)
      );
    });

    it('should handle failed settings fetch gracefully', async () => {
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse([{ key: { spaceId: 'space-1' } }])
      );
      soClient.bulkGet.mockRejectedValueOnce(new Error('SO fetch failed'));

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(result.nextState).toEqual({});
    });
  });

  describe('delete query execution', () => {
    it('should not delete when no stale documents exist', async () => {
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse([{ key: { spaceId: 'space-1' } }])
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse([
          {
            id: sloSettingsObjectId('space-1'),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 48 },
          },
        ]) as any
      );
      esClient.count.mockResolvedValueOnce({ count: 0 } as any);

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      expect(result.nextState).toEqual({});
    });

    it('should execute delete query when stale documents found', async () => {
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse([{ key: { spaceId: 'space-1' } }])
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse([
          {
            id: sloSettingsObjectId('space-1'),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 48 },
          },
        ]) as any
      );
      esClient.count.mockResolvedValueOnce({ count: 100 } as any);
      esClient.deleteByQuery.mockResolvedValueOnce({ task: 'delete-task-xyz' } as any);

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        {
          index: SUMMARY_DESTINATION_INDEX_PATTERN,
          wait_for_completion: false,
          conflicts: 'proceed',
          slices: 'auto',
          max_docs: 1_000_000,
          requests_per_second: 300,
          query: {
            bool: {
              should: [
                {
                  bool: {
                    filter: [
                      { terms: { spaceId: ['space-1'] } },
                      { range: { summaryUpdatedAt: { lt: 'now-48h' } } },
                    ],
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        },
        expect.objectContaining({ signal: abortController.signal })
      );
      expect(result.nextState).toEqual({ deleteTaskId: 'delete-task-xyz' });
    });

    it('should return deleteTaskId in state for async tracking', async () => {
      esClient.search.mockResolvedValueOnce(
        createMockSpaceAggregationResponse(
          Array.from({ length: 100 }, (_, i) => ({ key: { spaceId: `space-${i}` } })),
          { spaceId: 'space-99' }
        )
      );
      soClient.bulkGet.mockResolvedValueOnce(
        createMockSettingsResponse([
          {
            id: sloSettingsObjectId('space-0'),
            attributes: { staleInstancesCleanupEnabled: true, staleThresholdInHours: 48 },
          },
        ]) as any
      );
      esClient.count.mockResolvedValueOnce({ count: 50 } as any);
      esClient.deleteByQuery.mockResolvedValueOnce({ task: 'async-delete-task' } as any);

      const result = await cleanupStaleInstances(
        {},
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(result.nextState).toEqual({
        searchAfter: 'space-99',
        deleteTaskId: 'async-delete-task',
      });
    });
  });

  describe('error handling', () => {
    it('should preserve state on RequestAbortedError', async () => {
      esClient.search.mockRejectedValueOnce(new errors.RequestAbortedError('Aborted'));

      const result = await cleanupStaleInstances(
        { searchAfter: 'space-50' },
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(result.nextState).toEqual({ searchAfter: 'space-50', deleteTaskId: undefined });
    });

    it('should propagate other errors', async () => {
      esClient.search.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        cleanupStaleInstances({}, { esClient, soClient: soClient as any, logger, abortController })
      ).rejects.toThrow('Network error');
    });

    it('should handle RequestAbortedError during task check', async () => {
      esClient.tasks.get.mockRejectedValueOnce(new errors.RequestAbortedError('Aborted'));

      const result = await cleanupStaleInstances(
        { deleteTaskId: 'task-123' },
        { esClient, soClient: soClient as any, logger, abortController }
      );

      expect(result.nextState).toEqual({ deleteTaskId: 'task-123' });
    });
  });
});
