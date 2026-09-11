/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  fetchApiKeysStats,
  fetchIndexStats,
  fetchMonitorPrivileges,
  fetchNewIndex,
  type MonitorPrivileges,
} from './deployment_stats';

describe('fetchMonitorPrivileges', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockHasPrivileges = ({
    allIndices,
    cluster,
  }: {
    allIndices: boolean;
    cluster: boolean;
  }) => {
    client.asCurrentUser.security.hasPrivileges.mockResolvedValue({
      has_all_requested: allIndices && cluster,
      username: 'elastic',
      application: {},
      cluster: { monitor: cluster },
      index: { '*': { monitor: allIndices } },
    });
  };

  it('checks cluster monitor and index monitor over all indices in a single call', async () => {
    mockHasPrivileges({ allIndices: true, cluster: true });

    await expect(fetchMonitorPrivileges(client, logger)).resolves.toEqual({
      canMonitorAllIndices: true,
      canMonitorCluster: true,
    });

    expect(client.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      cluster: ['monitor'],
      index: [{ names: ['*'], privileges: ['monitor'] }],
    });
  });

  it('reports the two privileges independently', async () => {
    mockHasPrivileges({ allIndices: false, cluster: true });

    await expect(fetchMonitorPrivileges(client, logger)).resolves.toEqual({
      canMonitorAllIndices: false,
      canMonitorCluster: true,
    });
  });

  it('denies both (rather than granting either) when the check itself fails', async () => {
    client.asCurrentUser.security.hasPrivileges.mockRejectedValue(new Error('boom'));

    await expect(fetchMonitorPrivileges(client, logger)).resolves.toEqual({
      canMonitorAllIndices: false,
      canMonitorCluster: false,
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('fetchIndexStats', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
    mockDocumentCount(0);
    mockCatIndices([]);
    mockMetering([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockCatIndices = (indices: Array<{ index: string; 'creation.date': string }>) => {
    client.asCurrentUser.cat.indices.mockResolvedValue(indices);
  };

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
      _shards: { total: 1, successful: 1, failed: 0 },
      indices: {
        vectordb: {
          shards: {
            '0': [
              {
                dense_vector: { value_count: denseCount },
                sparse_vector: { value_count: sparseCount },
              },
            ],
          },
        },
      },
    } as any);
  };

  // both privileges default to granted; individual tests drop the one they are exercising
  const getIndexStats = (privileges: Partial<MonitorPrivileges> = {}) =>
    fetchIndexStats(client, logger, {
      canMonitorAllIndices: true,
      canMonitorCluster: true,
      ...privileges,
    });

  // metering takes no index pattern, so it is the one source that reports on system indices
  it('excludes dot-prefixed indices and aggregates count/size', async () => {
    mockMetering([
      { name: 'products', num_docs: 10, size_in_bytes: 100 },
      { name: '.kibana', num_docs: 999, size_in_bytes: 999 },
    ]);
    mockVectorStats(0);

    const result = await getIndexStats();

    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 100,
      vectorCount: 0,
      documentsCount: 0,
      newIndex: null,
    });
  });

  // metering lists an index as soon as it exists, but its figures only catch up on a refresh
  it('surfaces a new index whose size metering has not reported yet', async () => {
    mockCatIndices([{ index: 'brand-new', 'creation.date': String(Date.now() - 60_000) }]);
    mockMetering([{ name: 'brand-new', num_docs: 0, size_in_bytes: 0 }]);
    mockVectorStats(0);
    mockDocumentCount(42);

    const result = await getIndexStats();

    expect(result.indicesCount).toBe(1);
    expect(result.newIndex).toEqual(
      expect.objectContaining({ indexName: 'brand-new', documentsCount: 42, sizeInBytes: 0 })
    );
  });

  it('sums dense and sparse vector value_counts from operator indices.stats', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockVectorStats(100, 25);

    const result = await getIndexStats();

    expect(client.asInternalUser.indices.stats).toHaveBeenCalledWith({
      index: ['*', '-.*'],
      expand_wildcards: ['open'],
      level: 'shards',
      metric: ['dense_vector', 'sparse_vector'],
      filter_path: [
        '_shards',
        'indices.*.shards.*.dense_vector.value_count',
        'indices.*.shards.*.sparse_vector.value_count',
      ],
    });
    expect(result.vectorCount).toBe(125);
  });

  it('counts each logical shard once when multiple copies report vectors', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    client.asInternalUser.indices.stats.mockResolvedValue({
      _shards: { total: 2, successful: 2, failed: 0 },
      indices: {
        vectordb: {
          shards: {
            // the indexing shard and a search shard of the same logical shard
            '0': [{ dense_vector: { value_count: 100 } }, { dense_vector: { value_count: 90 } }],
            // a cold shard where only a search copy remains
            '1': [{ sparse_vector: { value_count: 10 } }],
          },
        },
      },
    } as any);

    const result = await fetchIndexStats(client, logger, {
      canMonitorAllIndices: true,
      canMonitorCluster: true,
    });

    expect(result.vectorCount).toBe(110);
  });

  it('skips the vector lookup entirely when the caller cannot monitor every index', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockDocumentCount(20);

    const result = await getIndexStats({ canMonitorAllIndices: false });

    // the scoped counts still resolve; only the cluster-wide vector total is withheld
    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 500,
      vectorCount: null,
      documentsCount: 20,
      newIndex: null,
    });
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
  });

  // `_cat/indices` needs cluster `monitor`, which the caller does not hold here
  it('skips the newest-index lookup when the caller cannot monitor the cluster', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockCatIndices([{ index: 'vectordb', 'creation.date': String(Date.now() - 60_000) }]);
    mockDocumentCount(20);

    const result = await getIndexStats({ canMonitorCluster: false });

    expect(result.newIndex).toBeNull();
    expect(client.asCurrentUser.cat.indices).not.toHaveBeenCalled();
  });

  // cluster `monitor` gates the newest-index lookup on its own, independent of index `monitor` on *
  it('surfaces the newest index for a caller that can monitor the cluster but not every index', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockCatIndices([{ index: 'vectordb', 'creation.date': String(Date.now() - 60_000) }]);
    mockDocumentCount(20);

    const result = await getIndexStats({ canMonitorAllIndices: false });

    expect(result.newIndex).toEqual(expect.objectContaining({ indexName: 'vectordb' }));
    // the cluster-wide vector total is still withheld from a caller without index monitor on *
    expect(result.vectorCount).toBeNull();
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
  });

  it('reports a null vectorCount for an unprivileged caller with an empty deployment', async () => {
    const result = await getIndexStats({ canMonitorAllIndices: false });

    // 0 would imply "no vectors"; the caller simply isn't allowed to know
    expect(result.vectorCount).toBeNull();
    expect(result.indicesCount).toBe(0);
  });

  it('treats missing dense/sparse stats as zero', async () => {
    mockMetering([{ name: 'products', num_docs: 10, size_in_bytes: 100 }]);
    client.asInternalUser.indices.stats.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
    } as any);

    const result = await getIndexStats();

    expect(result.vectorCount).toBe(0);
  });

  it('returns a null vectorCount when not all shards responded', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    client.asInternalUser.indices.stats.mockResolvedValue({
      _shards: { total: 3, successful: 2, failed: 0 },
      indices: {
        vectordb: {
          shards: { '0': [{ dense_vector: { value_count: 100 } }] },
        },
      },
    } as any);

    const result = await fetchIndexStats(client, logger, {
      canMonitorAllIndices: true,
      canMonitorCluster: true,
    });

    expect(result.vectorCount).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('2 of 3 shards'));
  });

  it('returns a null vectorCount (not 0) when the vector stats call fails', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    client.asInternalUser.indices.stats.mockRejectedValue(new Error('boom'));

    const result = await getIndexStats();

    // index/size counts are still valid; only the vector count is unavailable
    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 500,
      vectorCount: null,
      documentsCount: 0,
      newIndex: null,
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns a null indicesCount and storeSizeBytes when the metering call fails', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(new Error('metering down'));
    mockVectorStats(10);
    mockDocumentCount(20);

    const result = await getIndexStats();

    // both stats come from metering, but a count of 0 would claim the deployment is empty, so the
    // reads that do not depend on it still run
    expect(result).toEqual({
      indicesCount: null,
      storeSizeBytes: null,
      vectorCount: 10,
      documentsCount: 20,
      newIndex: null,
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('treats an index_not_found_exception from metering as an empty deployment', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(
      Object.assign(new Error('no metering data'), {
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception' } },
      })
    );

    const result = await getIndexStats();

    // a project metering has never reported on is empty, not broken
    expect(result.indicesCount).toBe(0);
    expect(result.storeSizeBytes).toBe(0);
  });

  it('reports a null count for a 404 that is not an index_not_found_exception', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(
      Object.assign(new Error('no handler found for uri [/_metering/stats]'), { statusCode: 404 })
    );
    mockVectorStats(10);
    mockDocumentCount(20);

    const result = await getIndexStats();

    // a metering API that is not there at all says nothing about how many indices exist
    expect(result.indicesCount).toBeNull();
    expect(result.storeSizeBytes).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('treats a metering response without indices as an empty deployment', async () => {
    client.asSecondaryAuthUser.transport.request.mockResolvedValue({
      _total: { num_docs: 0, size_in_bytes: 0 },
    });
    mockVectorStats(0);

    const result = await getIndexStats();

    expect(result).toEqual({
      indicesCount: 0,
      storeSizeBytes: 0,
      vectorCount: 0,
      documentsCount: 0,
      newIndex: null,
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

    const result = await getIndexStats();

    expect(result.indicesCount).toBe(2);
    expect(result.storeSizeBytes).toBe(100);
  });

  it('skips the follow-up reads when the caller has no indices', async () => {
    const result = await getIndexStats();

    // a genuinely empty deployment reports real zeros, not null
    expect(result).toEqual({
      indicesCount: 0,
      storeSizeBytes: 0,
      vectorCount: 0,
      documentsCount: 0,
      newIndex: null,
    });
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
    expect(client.asCurrentUser.count).not.toHaveBeenCalled();
    expect(client.asCurrentUser.cat.indices).not.toHaveBeenCalled();
  });

  it('counts top-level documents rather than reusing the metering num_docs', async () => {
    // metering counts the hidden nested docs that `semantic_text` chunking creates
    mockMetering([{ name: 'vectordb', num_docs: 5000, size_in_bytes: 500 }]);
    mockVectorStats(0);
    mockDocumentCount(500);

    const result = await getIndexStats();

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

    const result = await getIndexStats();

    expect(result.documentsCount).toBeNull();
    expect(result.vectorCount).toBe(10);
    // a partial count resolves rather than throwing, so it needs its own warning
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 of 2 shards'));
  });

  it('returns a null documentsCount (not 0) when the count call fails', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    mockVectorStats(10);
    client.asCurrentUser.count.mockRejectedValue(new Error('boom'));

    const result = await getIndexStats();

    // index/size/vector counts are still valid; only the document count is unavailable
    expect(result).toEqual({
      indicesCount: 1,
      storeSizeBytes: 500,
      vectorCount: 10,
      documentsCount: null,
      newIndex: null,
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('fetchNewIndex', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
    mockIndexCount(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockIndexCount = (count: number) => {
    client.asCurrentUser.count.mockResolvedValue({
      count,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    });
  };

  const now = Date.now();
  const hoursAgo = (hours: number) => now - hours * 60 * 60 * 1000;

  const created = (name: string, createdHoursAgo: number) => ({
    index: name,
    'creation.date': String(hoursAgo(createdHoursAgo)),
  });

  const mockCatIndices = (indices: Array<ReturnType<typeof created>>) => {
    client.asCurrentUser.cat.indices.mockResolvedValue(indices);
  };

  const metered = (name: string, sizeInBytes: number) => ({
    name,
    num_docs: 0,
    size_in_bytes: sizeInBytes,
  });

  it('returns the newest index created within the last 24 hours', async () => {
    mockCatIndices([created('new-index', 1), created('old-index', 48)]);
    mockIndexCount(100);

    const result = await fetchNewIndex(client, logger, [
      metered('new-index', 46121),
      metered('old-index', 2097152),
    ]);

    expect(result).toEqual({
      indexName: 'new-index',
      documentsCount: 100,
      sizeInBytes: 46121,
      createdAt: hoursAgo(1),
    });
  });

  it('asks Elasticsearch only for the user indices and their creation dates', async () => {
    mockCatIndices([]);

    await fetchNewIndex(client, logger, []);

    expect(client.asCurrentUser.cat.indices).toHaveBeenCalledWith({
      index: ['*', '-.*'],
      format: 'json',
      h: ['index', 'creation.date'],
      expand_wildcards: ['open'],
    });
  });

  // metering is the same source as the aggregate `storeSizeBytes`, so the panel and the tile agree
  it('takes the size from the metering stats', async () => {
    mockCatIndices([created('my-index', 1)]);
    mockIndexCount(3);

    const result = await fetchNewIndex(client, logger, [metered('my-index', 46121)]);

    expect(result!.sizeInBytes).toBe(46121);
  });

  it('reports a zero size for an index metering has not reported yet', async () => {
    mockCatIndices([created('brand-new', 1)]);

    const result = await fetchNewIndex(client, logger, []);

    expect(result!.sizeInBytes).toBe(0);
  });

  // metering's num_docs includes the hidden nested docs `semantic_text` chunking creates
  it('counts top-level documents with _count scoped to the single index', async () => {
    mockCatIndices([created('my-index', 1)]);
    mockIndexCount(42);

    const result = await fetchNewIndex(client, logger, [metered('my-index', 500)]);

    expect(client.asCurrentUser.count).toHaveBeenCalledWith({ index: 'my-index' });
    expect(result!.documentsCount).toBe(42);
  });

  it('returns null when every index is older than 24 hours', async () => {
    mockCatIndices([created('old-index', 48)]);

    const result = await fetchNewIndex(client, logger, [metered('old-index', 2097152)]);

    expect(result).toBeNull();
    expect(client.asCurrentUser.count).not.toHaveBeenCalled();
  });

  it('picks the newest when several indices fall inside the window', async () => {
    mockCatIndices([created('older-index', 12), created('newest-index', 1), created('middle', 6)]);
    mockIndexCount(50);

    const result = await fetchNewIndex(client, logger, [metered('newest-index', 512000)]);

    expect(result!.indexName).toBe('newest-index');
    expect(client.asCurrentUser.count).toHaveBeenCalledWith({ index: 'newest-index' });
  });

  it('returns null and logs when the index listing fails', async () => {
    client.asCurrentUser.cat.indices.mockRejectedValue(new Error('forbidden'));

    const result = await fetchNewIndex(client, logger, []);

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns null and logs when the document count fails', async () => {
    mockCatIndices([created('my-index', 1)]);
    client.asCurrentUser.count.mockRejectedValue(new Error('boom'));

    const result = await fetchNewIndex(client, logger, [metered('my-index', 500)]);

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns null when there are no indices at all', async () => {
    mockCatIndices([]);

    const result = await fetchNewIndex(client, logger, []);

    expect(result).toBeNull();
    expect(client.asCurrentUser.count).not.toHaveBeenCalled();
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
