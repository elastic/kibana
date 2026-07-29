/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { fetchDashboardsCount, fetchIndexStats } from './deployment_stats';

describe('fetchIndexStats', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockMetering = (
    indices: Array<{ name: string; num_docs: number; size_in_bytes: number }>
  ) => {
    client.asSecondaryAuthUser.transport.request.mockResolvedValue({
      _total: {
        num_docs: indices.reduce((sum, i) => sum + i.num_docs, 0),
        size_in_bytes: indices.reduce((sum, i) => sum + i.size_in_bytes, 0),
      },
      indices,
    });
  };

  const mockEsqlCount = (count: number) => {
    client.asCurrentUser.esql.query.mockResolvedValue({
      columns: [{ name: 'doc_count', type: 'long' }],
      values: [[count]],
    } as any);
  };

  const mockVectorStats = (denseCount: number, sparseCount = 0) => {
    client.asInternalUser.indices.stats.mockResolvedValue({
      _all: {
        primaries: {
          dense_vector: { value_count: denseCount },
          sparse_vector: { value_count: sparseCount },
        },
      },
      indices: {},
    } as any);
  };

  it('excludes dot-prefixed indices and aggregates count/size', async () => {
    mockMetering([
      { name: 'products', num_docs: 10, size_in_bytes: 100 },
      { name: '.kibana', num_docs: 999, size_in_bytes: 999 },
    ]);
    mockEsqlCount(10);
    mockVectorStats(0);

    const result = await fetchIndexStats(client, logger);

    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 100,
      vectorDocsCount: 0,
      documentsCount: 10,
    });
    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM "products" | STATS doc_count = COUNT(*)' })
    );
    expect(client.asInternalUser.indices.stats).toHaveBeenCalledWith({
      index: ['products'],
      metric: ['dense_vector', 'sparse_vector'],
    });
  });

  it('sums dense and sparse vector value_counts from operator indices.stats', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockEsqlCount(10);
    mockVectorStats(100, 25);

    const result = await fetchIndexStats(client, logger);

    expect(client.asInternalUser.indices.stats).toHaveBeenCalledWith({
      index: ['vectordb'],
      metric: ['dense_vector', 'sparse_vector'],
    });
    expect(result.documentsCount).toBe(10);
    expect(result.vectorDocsCount).toBe(125);
  });

  it('scopes vector stats to all user-visible indices from metering', async () => {
    mockMetering([
      { name: 'vectordb', num_docs: 10, size_in_bytes: 500 },
      { name: 'plain-text', num_docs: 5, size_in_bytes: 50 },
    ]);
    mockEsqlCount(15);
    mockVectorStats(10);

    const result = await fetchIndexStats(client, logger);

    expect(client.asInternalUser.indices.stats).toHaveBeenCalledWith({
      index: ['vectordb', 'plain-text'],
      metric: ['dense_vector', 'sparse_vector'],
    });
    expect(result.documentsCount).toBe(15);
    expect(result.vectorDocsCount).toBe(10);
  });

  it('treats missing dense/sparse stats as zero', async () => {
    mockMetering([{ name: 'products', num_docs: 10, size_in_bytes: 100 }]);
    mockEsqlCount(10);
    client.asInternalUser.indices.stats.mockResolvedValue({
      _all: { primaries: {} },
      indices: {},
    } as any);

    const result = await fetchIndexStats(client, logger);

    expect(result.vectorDocsCount).toBe(0);
  });

  it('batches the ES|QL count when there are more than 500 indices', async () => {
    const indices = Array.from({ length: 501 }, (_, i) => ({
      name: `vectordb-${i}`,
      num_docs: 1,
      size_in_bytes: 10,
    }));
    mockMetering(indices);
    client.asCurrentUser.esql.query
      .mockResolvedValueOnce({
        columns: [{ name: 'doc_count', type: 'long' }],
        values: [[500]],
      } as any)
      .mockResolvedValueOnce({
        columns: [{ name: 'doc_count', type: 'long' }],
        values: [[1]],
      } as any);
    mockVectorStats(501);

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledTimes(2);
    const queries = client.asCurrentUser.esql.query.mock.calls.map(
      ([request]) => (request as { query: string }).query
    );
    expect(queries[0]).toContain('"vectordb-0"');
    expect(queries[0]).toContain('"vectordb-499"');
    expect(queries[0]).not.toContain('"vectordb-500"');
    expect(queries[1]).toBe('FROM "vectordb-500" | STATS doc_count = COUNT(*)');
    expect(result.documentsCount).toBe(501);
    expect(result.vectorDocsCount).toBe(501);
  });

  it('returns a null vectorDocsCount (not 0) when the vector stats call fails', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    mockEsqlCount(10);
    client.asInternalUser.indices.stats.mockRejectedValue(new Error('boom'));

    const result = await fetchIndexStats(client, logger);

    // document/index/size counts are still valid; only the vector count is unavailable
    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 500,
      vectorDocsCount: null,
      documentsCount: 10,
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns a null documentsCount (not 0) when the ES|QL count fails', async () => {
    mockMetering([{ name: 'products', num_docs: 10, size_in_bytes: 100 }]);
    client.asCurrentUser.esql.query.mockRejectedValue(new Error('esql down'));
    mockVectorStats(0);

    const result = await fetchIndexStats(client, logger);

    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 100,
      vectorDocsCount: 0,
      documentsCount: null,
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns all-null (not zeros) when the metering call fails', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(new Error('metering down'));

    const result = await fetchIndexStats(client, logger);

    expect(result).toEqual({
      indicesCount: null,
      storeSizeBytes: null,
      vectorDocsCount: null,
      documentsCount: null,
    });
    expect(logger.warn).toHaveBeenCalled();
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
  });

  it('skips vector and document lookups when there are no user indices', async () => {
    mockMetering([]);

    const result = await fetchIndexStats(client, logger);

    // a genuinely empty deployment reports real zeros, not null
    expect(result).toEqual({
      indicesCount: 0,
      storeSizeBytes: 0,
      vectorDocsCount: 0,
      documentsCount: 0,
    });
    expect(client.asCurrentUser.esql.query).not.toHaveBeenCalled();
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
  });
});

describe('fetchDashboardsCount', () => {
  const logger = loggingSystemMock.createLogger();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the total from the saved objects client', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({ total: 7, page: 1, per_page: 0, saved_objects: [] });

    await expect(fetchDashboardsCount(soClient, logger)).resolves.toBe(7);
    expect(soClient.find).toHaveBeenCalledWith({ type: 'dashboard', perPage: 0 });
  });

  it('returns null (not 0) and logs when the lookup fails', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockRejectedValue(new Error('nope'));

    await expect(fetchDashboardsCount(soClient, logger)).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });
});
