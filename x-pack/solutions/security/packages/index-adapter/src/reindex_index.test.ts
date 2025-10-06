/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  IndicesSimulateIndexTemplateResponse,
  TasksGetResponse,
  ReindexResponse,
  IndicesGetResponse,
  TasksListResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { reindexIndexDocuments, getActiveReindexTasks } from './reindex_index';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

describe('reindexIndexDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully reindex documents in an index', async () => {
    const indexName = 'test-index';
    const taskId = 'task123';

    // Mock index exists
    esClient.indices.exists.mockResolvedValueOnce(true);

    // Mock get index info
    esClient.indices.get.mockResolvedValueOnce({
      [indexName]: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
        aliases: {},
      },
    } as IndicesGetResponse);

    // Mock simulate index template
    esClient.indices.simulateIndexTemplate.mockResolvedValueOnce({
      template: {
        mappings: { properties: { field1: { type: 'text' }, field2: { type: 'keyword' } } },
        settings: { index: { number_of_shards: 1 } },
        aliases: {},
      },
    } as IndicesSimulateIndexTemplateResponse);

    // Mock create index
    esClient.indices.create.mockResolvedValueOnce({
      acknowledged: true,
      index: 'new-index',
      shards_acknowledged: true,
    });

    // Mock reindex
    esClient.reindex.mockResolvedValueOnce({ task: taskId } as ReindexResponse);

    // Mock task completion
    esClient.tasks.get.mockResolvedValueOnce({
      completed: true,
      task: {
        status: {
          created: 100,
          updated: 0,
          failures: [],
        },
      },
    } as TasksGetResponse);

    // Mock get alias
    esClient.indices.getAlias.mockResolvedValueOnce({
      [indexName]: {
        aliases: {
          alias1: {},
        },
      },
    });

    // Mock update aliases
    esClient.indices.updateAliases.mockResolvedValueOnce({ acknowledged: true });

    // Mock delete old index
    esClient.indices.delete.mockResolvedValueOnce({ acknowledged: true });

    await reindexIndexDocuments({
      esClient,
      logger,
      indexName,
    });

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: indexName });
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({ name: indexName });
    expect(esClient.indices.create).toHaveBeenCalled();
    expect(esClient.reindex).toHaveBeenCalled();
    expect(esClient.indices.updateAliases).toHaveBeenCalled();
  });

  it('should throw error when index does not exist', async () => {
    const indexName = 'test-index';
    esClient.indices.exists.mockResolvedValueOnce(false);

    await expect(
      reindexIndexDocuments({
        esClient,
        logger,
        indexName,
      })
    ).rejects.toThrow(`Index ${indexName} does not exist`);
  });

  it('should clean up temporary index on failure', async () => {
    const indexName = 'test-index';
    const error = new Error('Reindex failed');

    esClient.indices.exists.mockResolvedValueOnce(true);
    esClient.indices.get.mockResolvedValueOnce({
      [indexName]: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
        aliases: {},
      },
    } as IndicesGetResponse);
    esClient.indices.simulateIndexTemplate.mockResolvedValueOnce({
      template: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
        aliases: {},
      },
    } as IndicesSimulateIndexTemplateResponse);
    esClient.indices.create.mockResolvedValueOnce({
      acknowledged: true,
      index: 'new-index',
      shards_acknowledged: true,
    });
    esClient.reindex.mockRejectedValueOnce(error);
    esClient.indices.delete.mockResolvedValueOnce({ acknowledged: true });

    await expect(
      reindexIndexDocuments({
        esClient,
        logger,
        indexName,
      })
    ).rejects.toThrow(error);

    expect(esClient.indices.delete).toHaveBeenCalledWith({
      index: expect.stringContaining(`${indexName}-reindex-`),
      ignore_unavailable: true,
    });
  });

  it('should handle task completion with failures', async () => {
    const indexName = 'test-index';
    const taskId = 'task123';

    esClient.indices.exists.mockResolvedValueOnce(true);
    esClient.indices.get.mockResolvedValueOnce({
      [indexName]: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
        aliases: {},
      },
    } as IndicesGetResponse);
    esClient.indices.simulateIndexTemplate.mockResolvedValueOnce({
      template: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
        aliases: {},
      },
    } as IndicesSimulateIndexTemplateResponse);
    esClient.indices.create.mockResolvedValueOnce({
      acknowledged: true,
      index: 'new-index',
      shards_acknowledged: true,
    });
    esClient.reindex.mockResolvedValueOnce({ task: taskId } as ReindexResponse);
    esClient.tasks.get.mockResolvedValueOnce({
      completed: true,
      task: {
        status: {
          failures: [{ error: 'some failure' }],
        },
      },
    } as TasksGetResponse);
    esClient.indices.delete.mockResolvedValueOnce({ acknowledged: true });

    await expect(
      reindexIndexDocuments({
        esClient,
        logger,
        indexName,
      })
    ).rejects.toThrow(/failed with 1 failures/);
  });

  it('should handle missing task ID', async () => {
    const indexName = 'test-index';

    esClient.indices.exists.mockResolvedValueOnce(true);
    esClient.indices.get.mockResolvedValueOnce({
      [indexName]: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
        aliases: {},
      },
    } as IndicesGetResponse);
    esClient.indices.simulateIndexTemplate.mockResolvedValueOnce({
      template: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
        aliases: {},
      },
    } as IndicesSimulateIndexTemplateResponse);
    esClient.indices.create.mockResolvedValueOnce({
      acknowledged: true,
      index: 'new-index',
      shards_acknowledged: true,
    });
    esClient.reindex.mockResolvedValueOnce({ task: undefined } as ReindexResponse);
    esClient.indices.delete.mockResolvedValueOnce({ acknowledged: true });

    await expect(
      reindexIndexDocuments({
        esClient,
        logger,
        indexName,
      })
    ).rejects.toThrow('Failed to get task ID for reindex operation');
  });

  it('should throw an error if a reindex operation is already in progress', async () => {
    const indexName = 'test-index';
    esClient.tasks.list.mockResolvedValueOnce({
      nodes: {
        node1: {
          tasks: {
            task1: {
              action: 'indices:data/write/reindex',
              cancellable: true,
              description: `reindex from [${indexName}] to [some-other-index]`,
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
      reindexIndexDocuments({
        esClient,
        logger,
        indexName,
      })
    ).rejects.toThrow(
      `A reindex operation is already in progress for index ${indexName}. Please wait for it to complete.`
    );
  });
});

describe('getActiveReindexTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return active reindex tasks for index', async () => {
    const indexName = 'test-index';

    esClient.tasks.list.mockResolvedValueOnce({
      nodes: {
        node1: {
          tasks: {
            task1: {
              action: 'indices:data/write/reindex',
              cancellable: true,
              description: `reindex from [${indexName}] to [${indexName}-reindex-123]`,
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
      indexName,
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
    const indexName = 'test-index';

    esClient.tasks.list.mockResolvedValueOnce({
      nodes: {},
    } as TasksListResponse);

    const tasks = await getActiveReindexTasks({
      esClient,
      logger,
      indexName,
    });

    expect(tasks).toHaveLength(0);
  });

  it('should handle errors gracefully', async () => {
    const indexName = 'test-index';
    const error = new Error('Tasks list failed');

    esClient.tasks.list.mockRejectedValueOnce(error);

    const tasks = await getActiveReindexTasks({
      esClient,
      logger,
      indexName,
    });

    expect(tasks).toHaveLength(0);
    expect(logger.error).toHaveBeenCalledWith(
      `Failed to get reindex tasks for ${indexName}: ${error.message}`
    );
  });
});
