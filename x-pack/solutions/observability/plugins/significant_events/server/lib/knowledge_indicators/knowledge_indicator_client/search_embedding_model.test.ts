/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import {
  createSearchEmbeddingModelResolver,
  invalidateSearchEmbeddingModel,
} from './search_embedding_model';

const mappingResponse = (searchEmbedding: Record<string, unknown> | undefined) => ({
  '.ds-ki-000001': {
    mappings: { properties: { search_embedding: searchEmbedding } },
  },
});

describe('createSearchEmbeddingModelResolver', () => {
  const logger = loggingSystemMock.createLogger();
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let counter = 0;
  let dataStream: string;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    dataStream = `.ki-test-${counter++}`;
  });

  it('reads a dense model with its inference endpoint', async () => {
    esClient.indices.getMapping.mockResolvedValue(
      mappingResponse({
        type: 'semantic_text',
        inference_id: '.jina-embeddings-v5-text-small',
        model_settings: { task_type: 'text_embedding', dimensions: 1024 },
      })
    );

    const resolve = createSearchEmbeddingModelResolver(esClient, logger, dataStream);

    expect(await resolve()).toEqual({
      kind: 'dense',
      inferenceId: '.jina-embeddings-v5-text-small',
    });
  });

  it('reads a sparse model', async () => {
    esClient.indices.getMapping.mockResolvedValue(
      mappingResponse({
        type: 'semantic_text',
        inference_id: '.elser-2-elasticsearch',
        model_settings: { task_type: 'sparse_embedding' },
      })
    );

    const resolve = createSearchEmbeddingModelResolver(esClient, logger, dataStream);

    expect(await resolve()).toEqual({ kind: 'sparse' });
  });

  it('does not cache unknown', async () => {
    esClient.indices.getMapping.mockResolvedValueOnce(mappingResponse({ type: 'semantic_text' }));
    esClient.indices.getMapping.mockResolvedValueOnce(
      mappingResponse({
        type: 'semantic_text',
        inference_id: '.elser-2-elasticsearch',
        model_settings: { task_type: 'sparse_embedding' },
      })
    );
    const resolve = createSearchEmbeddingModelResolver(esClient, logger, dataStream);

    expect(await resolve()).toEqual({ kind: 'unknown' });
    expect(await resolve()).toEqual({ kind: 'sparse' });
    expect(esClient.indices.getMapping).toHaveBeenCalledTimes(2);
  });

  it('caches a known model until invalidated', async () => {
    esClient.indices.getMapping.mockResolvedValue(
      mappingResponse({
        type: 'semantic_text',
        inference_id: 'dense-endpoint',
        model_settings: { task_type: 'text_embedding' },
      })
    );
    const resolve = createSearchEmbeddingModelResolver(esClient, logger, dataStream);

    await resolve();
    await resolve();
    expect(esClient.indices.getMapping).toHaveBeenCalledTimes(1);

    invalidateSearchEmbeddingModel(dataStream);
    await resolve();
    expect(esClient.indices.getMapping).toHaveBeenCalledTimes(2);
  });

  it('warns and returns unknown when the mapping cannot be read', async () => {
    esClient.indices.getMapping.mockRejectedValue(new Error('index_not_found_exception'));
    const resolve = createSearchEmbeddingModelResolver(esClient, logger, dataStream);

    expect(await resolve()).toEqual({ kind: 'unknown' });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('ranking with MATCH: index_not_found_exception')
    );
  });
});
