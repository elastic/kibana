/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  ensureMetadataDataStreamMappings,
  ensureMetadataDataStreamMappingsOnce,
  resetEnsuredMetadataNamespaces,
} from './ensure_metadata_mappings';

const DATA_STREAM = '.entities.v2.metadata.security_default';

const esError = (type: string, statusCode?: number) =>
  Object.assign(new Error(type), {
    statusCode,
    meta: { statusCode, body: { error: { type } } },
  });

describe('ensureMetadataDataStreamMappings', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    resetEnsuredMetadataNamespaces();
  });

  it('re-PUTs the metadata component template (idempotent) for future rollovers', async () => {
    await ensureMetadataDataStreamMappings(esClient, 'default', logger);
    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);
  });

  it('applies the mappings in place to the metadata data stream', async () => {
    await ensureMetadataDataStreamMappings(esClient, 'default', logger);

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
    const params = esClient.indices.putMapping.mock.calls[0][0];
    expect(params.index).toBe(DATA_STREAM);
    // Additive Ai_summary.* fields (and existing ones) come from the shared mapping source.
    expect(params.properties).toMatchObject({
      'Ai_summary.generated_by': { type: 'keyword' },
    });
  });

  it('does not roll over when the in-place update succeeds', async () => {
    await ensureMetadataDataStreamMappings(esClient, 'default', logger);
    expect(esClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('no-ops (no throw, no rollover) when the data stream does not exist yet', async () => {
    esClient.indices.putMapping.mockRejectedValueOnce(esError('index_not_found_exception', 404));

    await expect(
      ensureMetadataDataStreamMappings(esClient, 'default', logger)
    ).resolves.toBeUndefined();
    expect(esClient.indices.rollover).not.toHaveBeenCalled();
  });

  it('falls back to a rollover when the in-place update conflicts with an existing field type', async () => {
    esClient.indices.putMapping.mockRejectedValueOnce(esError('illegal_argument_exception', 400));

    await ensureMetadataDataStreamMappings(esClient, 'default', logger);

    expect(esClient.indices.rollover).toHaveBeenCalledTimes(1);
    const params = esClient.indices.rollover.mock.calls[0][0];
    expect(params.alias).toBe(DATA_STREAM);
  });

  it('rethrows unexpected errors instead of rolling over', async () => {
    esClient.indices.putMapping.mockRejectedValueOnce(esError('cluster_block_exception', 403));

    await expect(ensureMetadataDataStreamMappings(esClient, 'default', logger)).rejects.toThrow(
      /cluster_block_exception/
    );
    expect(esClient.indices.rollover).not.toHaveBeenCalled();
  });
});

describe('ensureMetadataDataStreamMappingsOnce', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    resetEnsuredMetadataNamespaces();
  });

  it('runs the sync once per namespace and no-ops on subsequent calls', async () => {
    await ensureMetadataDataStreamMappingsOnce(esClient, 'default', logger);
    await ensureMetadataDataStreamMappingsOnce(esClient, 'default', logger);

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
  });

  it('runs the sync separately for each namespace', async () => {
    await ensureMetadataDataStreamMappingsOnce(esClient, 'default', logger);
    await ensureMetadataDataStreamMappingsOnce(esClient, 'space-1', logger);

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
  });

  it('never throws and does not cache on failure (retries next time)', async () => {
    esClient.indices.putMapping.mockRejectedValueOnce(esError('cluster_block_exception', 403));

    await expect(
      ensureMetadataDataStreamMappingsOnce(esClient, 'default', logger)
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to sync'));

    // Not cached: a later write retries the sync.
    await ensureMetadataDataStreamMappingsOnce(esClient, 'default', logger);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
  });
});
