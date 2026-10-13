/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { readSearchEmbeddingModel } from './search_embedding_model';

const mappingWith = (searchEmbedding: Record<string, unknown> | undefined) => ({
  '.ds-ki-000001': { mappings: { properties: { search_embedding: searchEmbedding } } },
});

describe('readSearchEmbeddingModel', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads a dense model with its inference endpoint', async () => {
    esClient.indices.getMapping.mockResolvedValue(
      mappingWith({
        type: 'semantic_text',
        inference_id: '.jina-v5',
        model_settings: { task_type: 'text_embedding', dimensions: 1024 },
      })
    );

    await expect(readSearchEmbeddingModel(esClient, logger, 'ki')).resolves.toEqual({
      kind: 'dense',
      inferenceId: '.jina-v5',
    });
  });

  it('reads a sparse model', async () => {
    esClient.indices.getMapping.mockResolvedValue(
      mappingWith({
        type: 'semantic_text',
        inference_id: '.elser-2-elastic',
        model_settings: { task_type: 'sparse_embedding' },
      })
    );

    await expect(readSearchEmbeddingModel(esClient, logger, 'ki')).resolves.toEqual({
      kind: 'sparse',
    });
  });

  it('is unknown before the first embedded document sets the model', async () => {
    esClient.indices.getMapping.mockResolvedValue(mappingWith({ type: 'semantic_text' }));

    await expect(readSearchEmbeddingModel(esClient, logger, 'ki')).resolves.toEqual({
      kind: 'unknown',
    });
  });

  it('warns and is unknown when the mapping cannot be read', async () => {
    esClient.indices.getMapping.mockRejectedValue(new Error('index_not_found_exception'));

    await expect(readSearchEmbeddingModel(esClient, logger, 'ki')).resolves.toEqual({
      kind: 'unknown',
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('index_not_found_exception'));
  });
});
