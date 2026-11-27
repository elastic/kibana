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

const statsResponse = (
  indices: Record<string, { docs: number; bytes: number; dataSet?: number }>
) =>
  ({
    _shards: { total: 1, successful: 1, failed: 0 },
    _all: {},
    indices: Object.fromEntries(
      Object.entries(indices).map(([index, { docs, bytes, dataSet }]) => [
        index,
        {
          primaries: {
            docs: { count: docs },
            store: { size_in_bytes: bytes, total_data_set_size_in_bytes: dataSet },
          },
        },
      ])
    ),
  }) as never;

const setup = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const meteringClient = elasticsearchServiceMock.createElasticsearchClient();
  const getMeteringClient = jest.fn(() => meteringClient);
  const signal = new AbortController().signal;
  return { esClient, meteringClient, getMeteringClient, signal };
};

describe('getIndexSizes', () => {
  it("reads the primaries' data set size and documents, each index as a wildcard", async () => {
    const { esClient, getMeteringClient, signal } = setup();
    esClient.indices.stats.mockResolvedValue(
      statsResponse({ 'logs-a': { docs: 4, bytes: 100, dataSet: 400 } })
    );

    const result = await getIndexSizes({
      esClient,
      getMeteringClient,
      isServerless: false,
      indices: ['logs-a', 'logs-a'],
      signal,
    });

    expect(result).toEqual({
      sizes: new Map([['logs-a', { bytes: 400, docs: 4 }]]),
      missingPrivileges: false,
      skippedRemoteIndices: false,
    });
    expect(esClient.indices.stats).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ['logs-a*'],
        expand_wildcards: ['open', 'hidden'],
        metric: ['docs', 'store'],
      }),
      { signal }
    );
    // Read only on serverless: it throws for a request without credentials.
    expect(getMeteringClient).not.toHaveBeenCalled();
  });

  it('keeps the sizes it may read, and says some are missing, without failing', async () => {
    const { esClient, getMeteringClient, signal } = setup();
    // The user may monitor `logs-a` only, so the wildcard of `logs-b` matches nothing.
    esClient.indices.stats.mockResolvedValue(statsResponse({ 'logs-a': { docs: 1, bytes: 10 } }));

    const result = await getIndexSizes({
      esClient,
      getMeteringClient,
      isServerless: false,
      indices: ['logs-a', 'logs-b'],
      signal,
    });

    expect(result.sizes).toEqual(new Map([['logs-a', { bytes: 10, docs: 1 }]]));
    expect(result.missingPrivileges).toBe(true);
  });

  it('keeps only the requested indices of what the wildcards match', async () => {
    const { esClient, getMeteringClient, signal } = setup();
    esClient.indices.stats.mockResolvedValue(
      statsResponse({ 'apm-1': { docs: 1, bytes: 10 }, 'apm-10': { docs: 1, bytes: 99 } })
    );

    const { sizes } = await getIndexSizes({
      esClient,
      getMeteringClient,
      isServerless: false,
      indices: ['apm-1'],
      signal,
    });

    expect([...sizes.keys()]).toEqual(['apm-1']);
  });

  it('leaves out remote indices, which the stats do not read, and says so', async () => {
    const { esClient, getMeteringClient, signal } = setup();

    const result = await getIndexSizes({
      esClient,
      getMeteringClient,
      isServerless: false,
      indices: ['remote:logs-a'],
      signal,
    });

    expect(result).toEqual({
      sizes: new Map(),
      missingPrivileges: false,
      skippedRemoteIndices: true,
    });
    expect(esClient.indices.stats).not.toHaveBeenCalled();
  });

  it('fails on an error other than missing privileges', async () => {
    const { esClient, getMeteringClient, signal } = setup();
    esClient.indices.stats.mockRejectedValue(responseError(500));

    await expect(
      getIndexSizes({
        esClient,
        getMeteringClient,
        isServerless: false,
        indices: ['logs-a'],
        signal,
      })
    ).rejects.toThrow();
  });

  it('reads the metering stats on serverless, as the metering client', async () => {
    const { esClient, meteringClient, getMeteringClient, signal } = setup();
    meteringClient.transport.request.mockResolvedValue({
      indices: [{ name: 'logs-a', num_docs: 2, size_in_bytes: 300 }],
    });

    const result = await getIndexSizes({
      esClient,
      getMeteringClient,
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

  it('says the sizes are missing when serverless forbids them', async () => {
    const { esClient, meteringClient, getMeteringClient, signal } = setup();
    meteringClient.transport.request.mockRejectedValue(responseError(403));

    await expect(
      getIndexSizes({
        esClient,
        getMeteringClient,
        isServerless: true,
        indices: ['logs-a'],
        signal,
      })
    ).resolves.toEqual({ sizes: new Map(), missingPrivileges: true, skippedRemoteIndices: false });
  });
});
