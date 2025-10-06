/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  IndicesGetDataStreamResponse,
  ReindexResponse,
  TasksGetResponse,
  TasksListResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { reindexDataStreamDocuments, getActiveReindexTasks } from './reindex_data_stream';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

describe('reindexDataStreamDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip reindex when data stream has only one backing index', async () => {
    const dataStreamName = 'test-data-stream';
    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [
        {
          name: dataStreamName,
          timestamp_field: '@timestamp',
          indices: [{ index_name: 'test-data-stream-000001', index_uuid: 'uuid1' }],
          generation: 1,
          status: 'GREEN',
          template: 'test-template',
        },
      ],
    } as unknown as IndicesGetDataStreamResponse);

    await reindexDataStreamDocuments({
      esClient,
      logger,
      dataStreamName,
    });

    expect(logger.info).toHaveBeenCalledWith(
      `Data stream ${dataStreamName} has 1 backing indices, skipping reindex`
    );
    expect(esClient.reindex).not.toHaveBeenCalled();
  });

  it('should reindex older indices in data stream', async () => {
    const dataStreamName = 'test-data-stream';
    const taskId = 'task123';

    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [
        {
          name: dataStreamName,
          timestamp_field: '@timestamp',
          indices: [
            { index_name: 'test-data-stream-000001', index_uuid: 'uuid1' },
            { index_name: 'test-data-stream-000002', index_uuid: 'uuid2' },
            { index_name: 'test-data-stream-000003', index_uuid: 'uuid3' }, // current write index
          ],
          generation: 3,
          status: 'GREEN',
          template: 'test-template',
        },
      ],
    } as unknown as IndicesGetDataStreamResponse);

    esClient.reindex.mockResolvedValue({ task: taskId } as ReindexResponse);
    esClient.tasks.get
      .mockResolvedValueOnce({ completed: false } as TasksGetResponse)
      .mockResolvedValueOnce({
        completed: true,
        task: {
          status: {
            created: 100,
            updated: 0,
            failures: [],
          },
        },
      } as TasksGetResponse);

    await reindexDataStreamDocuments({
      esClient,
      logger,
      dataStreamName,
    });

    expect(esClient.reindex).toHaveBeenCalledTimes(2); // For the two older indices
    expect(esClient.reindex).toHaveBeenCalledWith({
      source: {
        index: 'test-data-stream-000001',
        size: 1000,
      },
      dest: {
        index: dataStreamName,
        op_type: 'create',
      },
      timeout: '10m',
      wait_for_completion: false,
      refresh: true,
    });
    expect(esClient.reindex).toHaveBeenCalledWith({
      source: {
        index: 'test-data-stream-000002',
        size: 1000,
      },
      dest: {
        index: dataStreamName,
        op_type: 'create',
      },
      timeout: '10m',
      wait_for_completion: false,
      refresh: true,
    });
  });

  it('should throw error when data stream not found', async () => {
    const dataStreamName = 'test-data-stream';
    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [],
    } as IndicesGetDataStreamResponse);

    await expect(
      reindexDataStreamDocuments({
        esClient,
        logger,
        dataStreamName,
      })
    ).rejects.toThrow(`Data stream ${dataStreamName} not found`);
  });

  it('should handle reindex task completion with failures', async () => {
    const dataStreamName = 'test-data-stream';
    const taskId = 'task123';

    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [
        {
          name: dataStreamName,
          timestamp_field: '@timestamp',
          indices: [
            { index_name: 'test-data-stream-000001', index_uuid: 'uuid1' },
            { index_name: 'test-data-stream-000002', index_uuid: 'uuid2' },
          ],
          generation: 2,
          status: 'GREEN',
          template: 'test-template',
        },
      ],
    } as unknown as IndicesGetDataStreamResponse);

    esClient.reindex.mockResolvedValue({ task: taskId } as ReindexResponse);
    esClient.tasks.get.mockResolvedValueOnce({
      completed: true,
      task: {
        status: {
          failures: [{ error: 'some failure' }],
        },
      },
    } as TasksGetResponse);

    await expect(
      reindexDataStreamDocuments({
        esClient,
        logger,
        dataStreamName,
      })
    ).rejects.toThrow('Reindex from test-data-stream-000001 failed with 1 failures');
  });

  it('should handle missing task ID', async () => {
    const dataStreamName = 'test-data-stream';

    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [
        {
          name: dataStreamName,
          timestamp_field: '@timestamp',
          indices: [
            { index_name: 'test-data-stream-000001', index_uuid: 'uuid1' },
            { index_name: 'test-data-stream-000002', index_uuid: 'uuid2' },
          ],
          generation: 2,
          status: 'GREEN',
          template: 'test-template',
        },
      ],
    } as unknown as IndicesGetDataStreamResponse);

    esClient.reindex.mockResolvedValueOnce({ task: undefined } as ReindexResponse);

    await expect(
      reindexDataStreamDocuments({
        esClient,
        logger,
        dataStreamName,
      })
    ).rejects.toThrow('Failed to get task ID for reindex operation from test-data-stream-000001');
  });

  it('should throw an error if a reindex operation is already in progress', async () => {
    const dataStreamName = 'test-data-stream';
    esClient.tasks.list.mockResolvedValueOnce({
      nodes: {
        node1: {
          tasks: {
            task1: {
              action: 'indices:data/write/reindex',
              cancellable: true,
              description: `reindex from [some-index] to [${dataStreamName}]`,
              headers: {},
              id: 1,
              node: 'node1',
              running_time_in_nanos: 1,
              start_time_in_millis: 1,
              status: {},
              type: 'task',
            },
          },
        },
      },
    } as TasksListResponse);

    await expect(
      reindexDataStreamDocuments({
        esClient,
        logger,
        dataStreamName,
      })
    ).rejects.toThrow(
      `A reindex operation is already in progress for data stream ${dataStreamName}. Please wait for it to complete.`
    );
  });
});

describe('getActiveReindexTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return active reindex tasks for data stream', async () => {
    const dataStreamName = 'test-data-stream';

    esClient.tasks.list.mockResolvedValueOnce({
      nodes: {
        node1: {
          tasks: {
            task1: {
              action: 'indices:data/write/reindex',
              cancellable: true,
              description: `reindex from [test-data-stream-000001] to [${dataStreamName}]`,
              headers: {},
              id: 1,
              node: 'node1',
              running_time_in_nanos: 1,
              start_time_in_millis: 1,
              status: {
                total: 1000,
                created: 500,
                updated: 0,
                batches: 5,
              },
              type: 'task',
            },
          },
        },
      },
    } as TasksListResponse);

    const tasks = await getActiveReindexTasks({
      esClient,
      logger,
      dataStreamName,
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual({
      taskId: 'task1',
      completed: false,
      total: 1000,
      created: 500,
      updated: 0,
      batches: 5,
    });
  });

  it('should return empty array when no tasks found', async () => {
    const dataStreamName = 'test-data-stream';

    esClient.tasks.list.mockResolvedValueOnce({
      nodes: {},
    } as TasksListResponse);

    const tasks = await getActiveReindexTasks({
      esClient,
      logger,
      dataStreamName,
    });

    expect(tasks).toHaveLength(0);
  });

  it('should handle errors gracefully', async () => {
    const dataStreamName = 'test-data-stream';
    const error = new Error('Tasks list failed');

    esClient.tasks.list.mockRejectedValueOnce(error);

    const tasks = await getActiveReindexTasks({
      esClient,
      logger,
      dataStreamName,
    });

    expect(tasks).toHaveLength(0);
    expect(logger.error).toHaveBeenCalledWith(
      `Failed to get reindex tasks for ${dataStreamName}: ${error.message}`
    );
  });
});
