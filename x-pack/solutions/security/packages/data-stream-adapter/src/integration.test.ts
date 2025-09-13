/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Integration test to demonstrate the new rollover and reindexing functionality
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  IndicesGetDataStreamResponse,
  IndicesRolloverResponse,
  IndicesSimulateIndexTemplateResponse,
  ReindexResponse,
  TasksGetResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { updateDataStreams } from './create_or_update_data_stream';

describe('Integration: Rollover and Reindexing', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle complete workflow: mapping update -> rollover -> reindex', async () => {
    const dataStreamName = 'logs-security-default';

    // Mock successful responses
    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [
        {
          name: dataStreamName,
          timestamp_field: '@timestamp',
          indices: [],
          generation: 1,
          status: 'GREEN',
          template: 'test-template',
        },
      ],
    } as unknown as IndicesGetDataStreamResponse);

    esClient.indices.putSettings.mockResolvedValueOnce({ acknowledged: true });
    esClient.indices.simulateIndexTemplate.mockResolvedValueOnce({
      template: {
        mappings: {
          properties: {
            message: {
              type: 'semantic_text',
              inference_id: 'new-inference-id',
            },
          },
        },
        aliases: {},
        settings: {},
      },
    } as IndicesSimulateIndexTemplateResponse);

    esClient.indices.putMapping.mockResolvedValueOnce({ acknowledged: true });
    esClient.indices.rollover.mockResolvedValueOnce({
      acknowledged: true,
    } as IndicesRolloverResponse);

    // Mock reindex workflow
    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [
        {
          name: dataStreamName,
          timestamp_field: '@timestamp',
          indices: [
            { index_name: 'logs-security-default-000001', index_uuid: 'uuid1' },
            { index_name: 'logs-security-default-000002', index_uuid: 'uuid2' },
            { index_name: 'logs-security-default-000003', index_uuid: 'uuid3' }, // current write index
          ],
          generation: 3,
          status: 'GREEN',
          template: 'test-template',
        },
      ],
    } as unknown as IndicesGetDataStreamResponse);

    esClient.reindex.mockResolvedValue({ task: 'task123' } as ReindexResponse);
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: {
        status: {
          created: 100,
          updated: 0,
          failures: [],
        },
      },
    } as TasksGetResponse);

    // Execute the complete workflow
    await updateDataStreams({
      esClient,
      logger,
      name: dataStreamName,
      totalFieldsLimit: 1000,
      writeIndexOnly: true,
      enableRollover: true,
      enableReindexing: true,
    });

    // Verify the sequence of operations
    expect(esClient.indices.putSettings).toHaveBeenCalled();
    expect(esClient.indices.putMapping).toHaveBeenCalled();
    expect(esClient.indices.rollover).toHaveBeenCalledWith({
      alias: dataStreamName,
      lazy: true,
    });
    expect(esClient.reindex).toHaveBeenCalledTimes(2); // For older indices only

    expect(logger.info).toHaveBeenCalledWith(`Updating data streams - ${dataStreamName}`);
    expect(logger.info).toHaveBeenCalledWith(
      `Triggering rollover for ${dataStreamName} after mapping update`
    );
    expect(logger.info).toHaveBeenCalledWith(
      `Starting reindex of older documents for ${dataStreamName}`
    );
  });

  it('should handle semantic text inference_id update scenario', async () => {
    const dataStreamName = 'logs-security-default';

    // Simulate semantic text mapping with updated inference_id
    const newMappings = {
      properties: {
        message: {
          type: 'semantic_text',
          inference_id: 'new-elser-model-v2',
        },
        '@timestamp': {
          type: 'date',
        },
      },
    };

    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [
        {
          name: dataStreamName,
          timestamp_field: '@timestamp',
          indices: [],
          generation: 1,
          status: 'GREEN',
          template: 'test-template',
        },
      ],
    } as unknown as IndicesGetDataStreamResponse);

    esClient.indices.putSettings.mockResolvedValueOnce({ acknowledged: true });
    esClient.indices.simulateIndexTemplate.mockResolvedValueOnce({
      template: { mappings: newMappings, aliases: {}, settings: {} },
    } as IndicesSimulateIndexTemplateResponse);

    esClient.indices.putMapping.mockResolvedValueOnce({ acknowledged: true });
    esClient.indices.rollover.mockResolvedValueOnce({
      acknowledged: true,
    } as IndicesRolloverResponse);

    // Mock reindex for semantic text update
    esClient.indices.getDataStream.mockResolvedValueOnce({
      data_streams: [
        {
          name: dataStreamName,
          timestamp_field: '@timestamp',
          indices: [
            { index_name: 'logs-security-default-000001', index_uuid: 'uuid1' },
            { index_name: 'logs-security-default-000002', index_uuid: 'uuid2' },
          ],
          generation: 2,
          status: 'GREEN',
          template: 'test-template',
        },
      ],
    } as unknown as IndicesGetDataStreamResponse);

    esClient.reindex.mockResolvedValue({ task: 'semantic-reindex-task' } as ReindexResponse);
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: {
        status: {
          created: 50,
          updated: 0,
          failures: [],
        },
      },
    } as TasksGetResponse);

    await updateDataStreams({
      esClient,
      logger,
      name: dataStreamName,
      totalFieldsLimit: 2000,
      writeIndexOnly: true,
      enableRollover: true,
      enableReindexing: true,
    });

    // Verify semantic text specific operations
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: dataStreamName,
      ...newMappings,
      write_index_only: true,
    });

    expect(esClient.reindex).toHaveBeenCalledWith({
      source: {
        index: 'logs-security-default-000001',
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
});
