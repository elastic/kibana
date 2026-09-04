/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { fetchApiKeysStats, fetchIndexStats, hasIndexMonitorPrivilege } from './deployment_stats';

describe('hasIndexMonitorPrivilege', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockHasPrivileges = (hasAllRequested: boolean) => {
    client.asCurrentUser.security.hasPrivileges.mockResolvedValue({
      has_all_requested: hasAllRequested,
      username: 'elastic',
      application: {},
      cluster: {},
      index: {},
    });
  };

  it('asks Elasticsearch whether the caller can monitor every index', async () => {
    mockHasPrivileges(true);

    await expect(hasIndexMonitorPrivilege(client, logger)).resolves.toBe(true);

    expect(client.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: ['*'], privileges: ['monitor'] }],
    });
  });

  it('denies a caller that holds the privilege on only some indices', async () => {
    mockHasPrivileges(false);

    await expect(hasIndexMonitorPrivilege(client, logger)).resolves.toBe(false);
  });

  it('denies access (rather than granting it) when the check itself fails', async () => {
    client.asCurrentUser.security.hasPrivileges.mockRejectedValue(new Error('boom'));

    await expect(hasIndexMonitorPrivilege(client, logger)).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('fetchIndexStats', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
    mockDocumentCount(0);
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

  const mockDocumentCount = (count: number, failedShards = 0) => {
    client.asCurrentUser.count.mockResolvedValue({
      count,
      _shards: { total: 2, successful: 2 - failedShards, skipped: 0, failed: failedShards },
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

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 100,
      vectorCount: 0,
      documentsCount: 0,
    });
  });

  it('sums dense and sparse vector value_counts from operator indices.stats', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockVectorStats(100, 25);

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    expect(client.asInternalUser.indices.stats).toHaveBeenCalledWith({
      index: ['*', '-.*'],
      expand_wildcards: ['open'],
      level: 'cluster',
      metric: ['dense_vector', 'sparse_vector'],
    });
    expect(result.vectorCount).toBe(125);
  });

  it('skips the vector lookup entirely when the caller cannot monitor every index', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockDocumentCount(20);

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: false });

    // the scoped counts still resolve; only the cluster-wide vector total is withheld
    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 500,
      vectorCount: null,
      documentsCount: 20,
    });
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
  });

  it('reports a null vectorCount for an unprivileged caller with an empty deployment', async () => {
    mockMetering([]);

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: false });

    // 0 would imply "no vectors"; the caller simply isn't allowed to know
    expect(result.vectorCount).toBeNull();
    expect(result.indicesCount).toBe(0);
  });

  it('treats missing dense/sparse stats as zero', async () => {
    mockMetering([{ name: 'products', num_docs: 10, size_in_bytes: 100 }]);
    client.asInternalUser.indices.stats.mockResolvedValue({
      _all: { primaries: {} },
      indices: {},
    } as any);

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    expect(result.vectorCount).toBe(0);
  });

  it('returns a null vectorCount (not 0) when the vector stats call fails', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    client.asInternalUser.indices.stats.mockRejectedValue(new Error('boom'));

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    // index/size counts are still valid; only the vector count is unavailable
    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 500,
      vectorCount: null,
      documentsCount: 0,
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns all-null (not zeros) when the metering call fails', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(new Error('metering down'));

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    expect(result).toEqual({
      indicesCount: null,
      storeSizeBytes: null,
      vectorCount: null,
      documentsCount: null,
    });
    expect(logger.warn).toHaveBeenCalled();
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
    expect(client.asCurrentUser.count).not.toHaveBeenCalled();
  });

  it('treats a metering response without indices as an empty deployment', async () => {
    client.asSecondaryAuthUser.transport.request.mockResolvedValue({
      _total: { num_docs: 0, size_in_bytes: 0 },
    });

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    expect(result).toEqual({
      indicesCount: 0,
      storeSizeBytes: 0,
      vectorCount: 0,
      documentsCount: 0,
    });
  });

  it('treats an index reported without a size as contributing nothing to the total', async () => {
    client.asSecondaryAuthUser.transport.request.mockResolvedValue({
      _total: { num_docs: 10, size_in_bytes: 100 },
      indices: [
        { name: 'sizeless', num_docs: 10 },
        { name: 'products', num_docs: 10, size_in_bytes: 100 },
      ],
    });
    mockVectorStats(0);

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    expect(result.indicesCount).toBe(2);
    expect(result.storeSizeBytes).toBe(100);
  });

  it('skips vector lookups when there are no user indices', async () => {
    mockMetering([]);

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    // a genuinely empty deployment reports real zeros, not null
    expect(result).toEqual({
      indicesCount: 0,
      storeSizeBytes: 0,
      vectorCount: 0,
      documentsCount: 0,
    });
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
    expect(client.asCurrentUser.count).not.toHaveBeenCalled();
  });

  it('counts top-level documents rather than reusing the metering num_docs', async () => {
    // metering counts the hidden nested docs that `semantic_text` chunking creates
    mockMetering([{ name: 'vectordb', num_docs: 5000, size_in_bytes: 500 }]);
    mockVectorStats(0);
    mockDocumentCount(500);

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    expect(client.asCurrentUser.count).toHaveBeenCalledWith({
      index: ['*', '-.*'],
      expand_wildcards: ['open'],
    });
    expect(result.documentsCount).toBe(500);
  });

  it('returns a null documentsCount when shards fail, rather than an undercount', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 5000, size_in_bytes: 500 }]);
    mockVectorStats(10);
    mockDocumentCount(120, 1);

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    expect(result.documentsCount).toBeNull();
    expect(result.vectorCount).toBe(10);
    // a partial count resolves rather than throwing, so it needs its own warning
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 of 2 shards'));
  });

  it('returns a null documentsCount (not 0) when the count call fails', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    mockVectorStats(10);
    client.asCurrentUser.count.mockRejectedValue(new Error('boom'));

    const result = await fetchIndexStats(client, logger, { canMonitorAllIndices: true });

    // index/size/vector counts are still valid; only the document count is unavailable
    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 500,
      vectorCount: 10,
      documentsCount: null,
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('fetchApiKeysStats', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('counts the same keys as the Stack Management API keys list', async () => {
    client.asCurrentUser.security.queryApiKeys.mockResolvedValue({
      total: 4,
      count: 0,
      api_keys: [],
      aggregations: { expiring: { doc_count: 2 } },
    });

    await expect(fetchApiKeysStats(client, logger)).resolves.toEqual({ total: 4, expiring: 2 });

    // keys Kibana creates on the user's behalf are hidden from that list, so they aren't counted
    expect(client.asCurrentUser.security.queryApiKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 0,
        query: {
          bool: {
            must: [{ term: { invalidated: false } }, { term: { type: 'rest' } }],
            must_not: [
              { prefix: { name: { value: 'Alerting: ' } } },
              { term: { 'metadata.managed': true } },
            ],
          },
        },
      })
    );
  });

  // an unbounded `expiration > now` would also count keys that are not due for months
  it('counts only the keys expiring within the next 30 days', async () => {
    client.asCurrentUser.security.queryApiKeys.mockResolvedValue({
      total: 4,
      count: 0,
      api_keys: [],
      aggregations: { expiring: { doc_count: 2 } },
    });

    await fetchApiKeysStats(client, logger);

    expect(client.asCurrentUser.security.queryApiKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        aggs: {
          expiring: { filter: { range: { expiration: { gt: 'now', lte: 'now+30d' } } } },
        },
      })
    );
  });

  it('reports 0 expiring keys when none of the keys expire', async () => {
    client.asCurrentUser.security.queryApiKeys.mockResolvedValue({
      total: 1,
      count: 0,
      api_keys: [],
      aggregations: { expiring: { doc_count: 0 } },
    });

    await expect(fetchApiKeysStats(client, logger)).resolves.toEqual({ total: 1, expiring: 0 });
  });

  it('reports 0 expiring keys when the aggregation is missing from the response', async () => {
    client.asCurrentUser.security.queryApiKeys.mockResolvedValue({
      total: 2,
      count: 0,
      api_keys: [],
    });

    await expect(fetchApiKeysStats(client, logger)).resolves.toEqual({ total: 2, expiring: 0 });
  });

  it('returns null values (not zeros) and logs when the lookup fails', async () => {
    client.asCurrentUser.security.queryApiKeys.mockRejectedValue(new Error('forbidden'));

    await expect(fetchApiKeysStats(client, logger)).resolves.toEqual({
      total: null,
      expiring: null,
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});
