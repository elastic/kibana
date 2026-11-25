/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getIndexSizes } from './get_index_sizes';

const responseError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type: 'security_exception' } },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

const setup = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const meteringClient = elasticsearchServiceMock.createElasticsearchClient();
  const signal = new AbortController().signal;
  return { esClient, meteringClient, signal };
};

describe('getIndexSizes', () => {
  it("reads the primaries' size and documents from the index stats, once per index", async () => {
    const { esClient, meteringClient, signal } = setup();
    esClient.indices.stats.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      _all: {},
      indices: { 'logs-a': { primaries: { docs: { count: 4 }, store: { size_in_bytes: 400 } } } },
    } as never);

    const result = await getIndexSizes({
      esClient,
      meteringClient,
      isServerless: false,
      indices: ['logs-a', 'logs-a'],
      signal,
    });

    expect(result).toEqual({
      sizes: new Map([['logs-a', { bytes: 400, docs: 4 }]]),
      missingPrivileges: false,
    });
    expect(esClient.indices.stats).toHaveBeenCalledWith(
      expect.objectContaining({ index: ['logs-a'], metric: ['docs', 'store'] }),
      { signal }
    );
    expect(meteringClient.transport.request).not.toHaveBeenCalled();
  });

  it('leaves out remote indices, which the stats do not read', async () => {
    const { esClient, meteringClient, signal } = setup();

    const result = await getIndexSizes({
      esClient,
      meteringClient,
      isServerless: false,
      indices: ['remote:logs-a'],
      signal,
    });

    expect(result.sizes.size).toBe(0);
    expect(esClient.indices.stats).not.toHaveBeenCalled();
  });

  it('reports missing privileges instead of failing without monitor', async () => {
    const { esClient, meteringClient, signal } = setup();
    esClient.indices.stats.mockRejectedValue(responseError(403));

    await expect(
      getIndexSizes({ esClient, meteringClient, isServerless: false, indices: ['logs-a'], signal })
    ).resolves.toEqual({ sizes: new Map(), missingPrivileges: true });
  });

  it('fails on any other error', async () => {
    const { esClient, meteringClient, signal } = setup();
    esClient.indices.stats.mockRejectedValue(responseError(500));

    await expect(
      getIndexSizes({ esClient, meteringClient, isServerless: false, indices: ['logs-a'], signal })
    ).rejects.toThrow();
  });

  it('reads the metering stats on serverless, as the metering client', async () => {
    const { esClient, meteringClient, signal } = setup();
    meteringClient.transport.request.mockResolvedValue({
      indices: [{ name: 'logs-a', num_docs: 2, size_in_bytes: 300 }],
    });

    const result = await getIndexSizes({
      esClient,
      meteringClient,
      isServerless: true,
      indices: ['logs-a'],
      signal,
    });

    expect(result.sizes).toEqual(new Map([['logs-a', { bytes: 300, docs: 2 }]]));
    expect(meteringClient.transport.request).toHaveBeenCalledWith(
      { method: 'GET', path: '/_metering/stats/logs-a' },
      { signal }
    );
    expect(esClient.indices.stats).not.toHaveBeenCalled();
  });
});
