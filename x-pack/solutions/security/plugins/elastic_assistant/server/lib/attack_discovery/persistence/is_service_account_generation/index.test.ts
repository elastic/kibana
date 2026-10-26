/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { isServiceAccountGeneration } from '.';
import { getServiceAccountGenerationQuery } from '../get_service_account_generation_query';

const params = {
  eventLogIndex: 'test-event-log-index',
  executionUuid: 'test-execution-uuid',
  spaceId: 'test-space-id',
};

const mockSearchResponse = (total: number | { relation: 'eq'; value: number } | undefined) => ({
  _shards: { failed: 0, successful: 1, total: 1 },
  hits: { hits: [], total },
  timed_out: false,
  took: 1,
});

describe('isServiceAccountGeneration', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('searches with the service account generation query', async () => {
    esClient.search.mockResolvedValue(mockSearchResponse({ relation: 'eq', value: 0 }));

    await isServiceAccountGeneration({ ...params, esClient });

    expect(esClient.search).toHaveBeenCalledWith(getServiceAccountGenerationQuery(params));
  });

  it('returns true when a tagged event exists', async () => {
    esClient.search.mockResolvedValue(mockSearchResponse({ relation: 'eq', value: 1 }));

    expect(await isServiceAccountGeneration({ ...params, esClient })).toBe(true);
  });

  it('returns false when no tagged event exists', async () => {
    esClient.search.mockResolvedValue(mockSearchResponse({ relation: 'eq', value: 0 }));

    expect(await isServiceAccountGeneration({ ...params, esClient })).toBe(false);
  });

  it('supports a numeric total', async () => {
    esClient.search.mockResolvedValue(mockSearchResponse(1));

    expect(await isServiceAccountGeneration({ ...params, esClient })).toBe(true);
  });

  it('returns false when the total is missing', async () => {
    esClient.search.mockResolvedValue(mockSearchResponse(undefined));

    expect(await isServiceAccountGeneration({ ...params, esClient })).toBe(false);
  });
});
