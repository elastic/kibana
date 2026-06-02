/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ensureMlAdDetailsDataStream, ML_AD_DETAILS_MAPPING } from './details_index';
import { getMlAdDetailsIndexName } from './constants';

const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
let logger: ReturnType<typeof loggingSystemMock.createLogger>;

describe('ensureMlAdDetailsDataStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
  });

  it('creates the index template and data stream when it does not exist', async () => {
    esClient.indices.putIndexTemplate.mockResolvedValue({} as never);
    esClient.indices.createDataStream.mockResolvedValue({} as never);

    const dataStream = getMlAdDetailsIndexName('default');
    const result = await ensureMlAdDetailsDataStream({ esClient, logger, namespace: 'default' });

    expect(result).toBe(dataStream);
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        index_patterns: [expect.stringContaining('ml-ad-jobs-latest')],
        data_stream: { hidden: true },
        template: expect.objectContaining({
          mappings: ML_AD_DETAILS_MAPPING,
          lifecycle: { data_retention: '360d' },
        }),
      })
    );
    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({ name: dataStream });
  });

  it('uses the namespace to build the data stream name', async () => {
    esClient.indices.putIndexTemplate.mockResolvedValue({} as never);
    esClient.indices.createDataStream.mockResolvedValue({} as never);

    const result = await ensureMlAdDetailsDataStream({ esClient, logger, namespace: 'my-space' });

    expect(result).toBe(getMlAdDetailsIndexName('my-space'));
    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
      name: getMlAdDetailsIndexName('my-space'),
    });
  });

  describe('error handling', () => {
    it('swallows resource_already_exists_exception from concurrent creation', async () => {
      esClient.indices.putIndexTemplate.mockResolvedValue({} as never);
      esClient.indices.createDataStream.mockRejectedValue(
        new Error('resource_already_exists_exception: data_stream already exists')
      );

      const result = await ensureMlAdDetailsDataStream({ esClient, logger, namespace: 'default' });

      expect(result).toBe(getMlAdDetailsIndexName('default'));
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('logs and swallows template creation errors', async () => {
      esClient.indices.putIndexTemplate.mockRejectedValue(new Error('cluster_block_exception'));

      const result = await ensureMlAdDetailsDataStream({ esClient, logger, namespace: 'default' });

      expect(result).toBe(getMlAdDetailsIndexName('default'));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster_block_exception'));
    });

    it('logs and swallows unexpected data stream creation errors', async () => {
      esClient.indices.putIndexTemplate.mockResolvedValue({} as never);
      esClient.indices.createDataStream.mockRejectedValue(new Error('cluster_block_exception'));

      const result = await ensureMlAdDetailsDataStream({ esClient, logger, namespace: 'default' });

      expect(result).toBe(getMlAdDetailsIndexName('default'));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster_block_exception'));
    });
  });
});
