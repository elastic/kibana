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
    mockVectorStats(0);

    const result = await fetchIndexStats(client, logger);

    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 100,
      vectorCount: 0,
    });
  });

  it('sums dense and sparse vector value_counts from operator indices.stats', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockVectorStats(100, 25);

    const result = await fetchIndexStats(client, logger);

    expect(client.asInternalUser.indices.stats).toHaveBeenCalledWith({
      index: ['*', '-.*'],
      expand_wildcards: ['open'],
      level: 'cluster',
      metric: ['dense_vector', 'sparse_vector'],
    });
    expect(result.vectorCount).toBe(125);
  });

  it('treats missing dense/sparse stats as zero', async () => {
    mockMetering([{ name: 'products', num_docs: 10, size_in_bytes: 100 }]);
    client.asInternalUser.indices.stats.mockResolvedValue({
      _all: { primaries: {} },
      indices: {},
    } as any);

    const result = await fetchIndexStats(client, logger);

    expect(result.vectorCount).toBe(0);
  });

  it('returns a null vectorCount (not 0) when the vector stats call fails', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    client.asInternalUser.indices.stats.mockRejectedValue(new Error('boom'));

    const result = await fetchIndexStats(client, logger);

    // index/size counts are still valid; only the vector count is unavailable
    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 500,
      vectorCount: null,
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns all-null (not zeros) when the metering call fails', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(new Error('metering down'));

    const result = await fetchIndexStats(client, logger);

    expect(result).toEqual({
      indicesCount: null,
      storeSizeBytes: null,
      vectorCount: null,
    });
    expect(logger.warn).toHaveBeenCalled();
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
  });

  it('skips vector lookups when there are no user indices', async () => {
    mockMetering([]);

    const result = await fetchIndexStats(client, logger);

    // a genuinely empty deployment reports real zeros, not null
    expect(result).toEqual({
      indicesCount: 0,
      storeSizeBytes: 0,
      vectorCount: 0,
    });
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
