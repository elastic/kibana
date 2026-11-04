/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { readSearchEmbeddingModel } from './search_embedding_model';

const indexWith = (searchEmbedding: Record<string, unknown>) => ({
  mappings: { properties: { search_embedding: searchEmbedding } },
});

const dense = (inferenceId: string, extra: Record<string, unknown> = {}) => ({
  type: 'semantic_text',
  inference_id: inferenceId,
  model_settings: { task_type: 'text_embedding', dimensions: 1024 },
  ...extra,
});

describe('readSearchEmbeddingModel', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers search_inference_id', async () => {
    esClient.indices.getMapping.mockResolvedValue({
      '.ds-ki-000001': indexWith(dense('.jina-v5', { search_inference_id: 'jina-v5-query' })),
    });

    await expect(readSearchEmbeddingModel(esClient, logger, 'ki')).resolves.toEqual({
      kind: 'dense',
      inferenceId: 'jina-v5-query',
    });
  });

  it('reads a sparse model', async () => {
    esClient.indices.getMapping.mockResolvedValue({
      '.ds-ki-000001': indexWith({
        type: 'semantic_text',
        inference_id: '.elser-2-elastic',
        model_settings: { task_type: 'sparse_embedding' },
      }),
    });

    await expect(readSearchEmbeddingModel(esClient, logger, 'ki')).resolves.toEqual({
      kind: 'sparse',
    });
  });

  it('reads the dense model agreed on by backing indices, skipping those without model_settings', async () => {
    esClient.indices.getMapping.mockResolvedValue({
      '.ds-ki-000001': indexWith({ type: 'semantic_text' }),
      '.ds-ki-000002': indexWith(dense('.jina-v5')),
      '.ds-ki-000003': indexWith(dense('.jina-v5')),
    });

    await expect(readSearchEmbeddingModel(esClient, logger, 'ki')).resolves.toEqual({
      kind: 'dense',
      inferenceId: '.jina-v5',
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('is unknown when backing indices disagree', async () => {
    esClient.indices.getMapping.mockResolvedValue({
      '.ds-ki-000001': indexWith(dense('.jina-v4')),
      '.ds-ki-000002': indexWith(dense('.jina-v5')),
    });

    await expect(readSearchEmbeddingModel(esClient, logger, 'ki')).resolves.toEqual({
      kind: 'unknown',
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('.ds-ki-000002'));
  });

  it('is unknown when the mapping cannot be read', async () => {
    esClient.indices.getMapping.mockRejectedValue(new Error('index_not_found_exception'));

    await expect(readSearchEmbeddingModel(esClient, logger, 'ki')).resolves.toEqual({
      kind: 'unknown',
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('index_not_found_exception'));
  });
});
