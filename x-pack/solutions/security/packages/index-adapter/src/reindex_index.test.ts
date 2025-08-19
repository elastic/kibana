/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { reindexIndexDocuments, getActiveReindexTasks } from './reindex_index';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

describe('reindexIndexDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully reindex documents in an index', async () => {
    const indexName = 'test-index';
    const tempIndexName = `${indexName}-reindex-${Date.now()}`;
    const taskId = 'task123';

    // Mock index exists
    esClient.indices.exists.mockResolvedValueOnce(true);
    
    // Mock get index info
    esClient.indices.get.mockResolvedValueOnce({
      [indexName]: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
      },
    });

    // Mock simulate index template
    esClient.indices.simulateIndexTemplate.mockResolvedValueOnce({
      template: {
        mappings: { properties: { field1: { type: 'text' }, field2: { type: 'keyword' } } },
        settings: { index: { number_of_shards: 1 } },
      },
    });

    // Mock create index
    esClient.indices.create.mockResolvedValueOnce({ acknowledged: true });

    // Mock reindex
    esClient.reindex.mockResolvedValueOnce({ task: taskId });

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
    });

    // Mock get alias
    esClient.indices.getAlias.mockResolvedValueOnce({
      [indexName]: {
        aliases: {
          'alias1': {},
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
      },
    });
    esClient.indices.simulateIndexTemplate.mockResolvedValueOnce({
      template: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
      },
    });
    esClient.indices.create.mockResolvedValueOnce({ acknowledged: true });
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
      },
    });
    esClient.indices.simulateIndexTemplate.mockResolvedValueOnce({
      template: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
      },
    });
    esClient.indices.create.mockResolvedValueOnce({ acknowledged: true });
    esClient.reindex.mockResolvedValueOnce({ task: taskId });
    esClient.tasks.get.mockResolvedValueOnce({
      completed: true,
      task: {
        status: {
          failures: [{ error: 'some failure' }],
        },
      },
    });
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
      },
    });
    esClient.indices.simulateIndexTemplate.mockResolvedValueOnce({
      template: {
        mappings: { properties: { field1: { type: 'text' } } },
        settings: { index: { number_of_shards: 1 } },
      },
    });
    esClient.indices.create.mockResolvedValueOnce({ acknowledged: true });
    esClient.reindex.mockResolvedValueOnce({ task: null });
    esClient.indices.delete.mockResolvedValueOnce({ acknowledged: true });

    await expect(
      reindexIndexDocuments({
        esClient,
        logger,
        indexName,
      })
    ).rejects.toThrow('Failed to get task ID for reindex operation');
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
            'task1': {
              description: `reindex from [${indexName}] to [${indexName}-reindex-123]`,
              status: {
                total: 1000,
                created: 500,
                updated: 0,
                batches: 5,
              },
            },
          },
        },
      },
    });

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
    });

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
    expect(logger.error).toHaveBeenCalledWith(`Failed to get reindex tasks for ${indexName}: ${error.message}`);
  });
});