/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesStatsIndicesStats,
  IndicesStatsShardStats,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { NewIndexDetails } from '../../common/types';

interface ApiKeysStats {
  total: number | null;
  expiring: number | null;
}

interface MeteringIndexStat {
  name: string;
  num_docs: number;
  size_in_bytes: number;
}

interface MeteringStatsResponse {
  _total: { num_docs: number; size_in_bytes: number };
  indices: MeteringIndexStat[];
}

interface IndexStats {
  indicesCount: number | null;
  storeSizeBytes: number | null;
  vectorCount: number | null;
  documentsCount: number | null;
  newIndex: NewIndexDetails | null;
}

const INDEX_STATS_UNAVAILABLE: IndexStats = {
  indicesCount: null,
  storeSizeBytes: null,
  vectorCount: null,
  documentsCount: null,
  newIndex: null,
};

export interface MonitorPrivileges {
  canMonitorAllIndices: boolean;
  canMonitorCluster: boolean;
}

const USER_INDICES_PATTERN = ['*', '-.*'];

/**
 * The monitor privileges that gate the vector count, which Elasticsearch does not scope to the
 * caller, and the newest-index lookup, whose `_cat` call requires cluster `monitor`. A single
 * `hasPrivileges` call covers both, and any error denies access rather than granting it.
 */
export const fetchMonitorPrivileges = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<MonitorPrivileges> => {
  try {
    const { cluster, index } = await client.asCurrentUser.security.hasPrivileges({
      cluster: ['monitor'],
      index: [{ names: ['*'], privileges: ['monitor'] }],
    });

    return {
      canMonitorAllIndices: index?.['*']?.monitor === true,
      canMonitorCluster: cluster?.monitor === true,
    };
  } catch (error) {
    logger.warn(
      `Failed to check monitor privileges for vectordb deployment stats. Denying access: ${error.message}`
    );
    return { canMonitorAllIndices: false, canMonitorCluster: false };
  }
};

const shardVectorCount = (shard: IndicesStatsShardStats): number =>
  (shard.dense_vector?.value_count ?? 0) + (shard.sparse_vector?.value_count ?? 0);

/**
 * Sums vector counts across indices, counting each logical shard exactly once. Neither of the
 * `_all` rollups is usable in stateless: `primaries` reports nothing for an index whose indexing
 * shard has been released as idle, and `total` counts every shard copy of an active index. The max
 * across a shard's copies tolerates refresh lag between them.
 */
const sumVectorCounts = (indices: Record<string, IndicesStatsIndicesStats> | undefined): number => {
  let count = 0;
  for (const index of Object.values(indices ?? {})) {
    for (const copies of Object.values(index.shards ?? {})) {
      if (copies.length > 0) {
        count += Math.max(...copies.map(shardVectorCount));
      }
    }
  }
  return count;
};

/**
 * Counts indexed dense + sparse vectors, counting each logical shard exactly once.
 * In stateless 'total' and 'primaries' can both return the wrong counts because they might not be loaded onto nodes.
 * Returns null when not all shards responded.
 */
const countVectors = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<number | null> => {
  const { _shards: shards, indices } = await client.asInternalUser.indices.stats({
    index: USER_INDICES_PATTERN,
    expand_wildcards: ['open'],
    level: 'shards',
    metric: ['dense_vector', 'sparse_vector'],
    filter_path: [
      '_shards',
      'indices.*.shards.*.dense_vector.value_count',
      'indices.*.shards.*.sparse_vector.value_count',
    ],
  });

  if (!shards || shards.successful !== shards.total) {
    logger.warn(
      `Vector count covered only ${shards?.successful ?? 0} of ${shards?.total ?? 0} shards.`
    );
    return null;
  }

  return sumVectorCounts(indices);
};

/**
 * Counts top-level documents via `_count`, which matches root documents only. It cannot opt out of
 * partial results, so a failed shard is reported as unavailable rather than an undercount.
 */
const countDocuments = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<number | null> => {
  const { count, _shards: shards } = await client.asCurrentUser.count({
    index: USER_INDICES_PATTERN,
    expand_wildcards: ['open'],
  });

  if (shards.failed > 0) {
    logger.warn(
      `Document count for vectordb deployment stats covered only ${
        shards.total - shards.failed
      } of ${shards.total} shards. Reporting it as unavailable rather than as an undercount.`
    );
    return null;
  }

  return count;
};

/**
 * The caller's indices as billed, which is the only size figure serverless treats as authoritative
 * and the source of the index count. The call is authorized as the internal user, so Elasticsearch
 * scopes the rows to the caller from the secondary credential rather than from the request itself.
 */
const fetchMeteredIndices = async (client: IScopedClusterClient): Promise<MeteringIndexStat[]> => {
  try {
    const meteringStats = await client.asSecondaryAuthUser.transport.request<MeteringStatsResponse>(
      {
        method: 'GET',
        path: '/_metering/stats',
      }
    );

    return (meteringStats.indices ?? []).filter((index) => !index.name.startsWith('.'));
  } catch (error) {
    // metering 404s with an `index_not_found_exception` when it matches no indices at all, which is
    // either an empty project or a caller whose privileges match nothing.
    if (error.body?.error?.type === 'index_not_found_exception') {
      return [];
    }
    throw error;
  }
};

const RECENTLY_CREATED_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The newest index created within `RECENTLY_CREATED_WINDOW_MS`, or `null` when there is none.
 * Uses `_cat/indices` for creation date (only non-operator source in serverless), metering for
 * size (billed amount), and `_count` for doc count (excludes hidden nested docs).
 */
export const fetchNewIndex = async (
  client: IScopedClusterClient,
  logger: Logger,
  meteredIndices: MeteringIndexStat[]
): Promise<NewIndexDetails | null> => {
  try {
    const indices = await client.asCurrentUser.cat.indices({
      index: USER_INDICES_PATTERN,
      format: 'json',
      h: ['index', 'creation.date'],
      expand_wildcards: ['open'],
    });

    const cutoff = Date.now() - RECENTLY_CREATED_WINDOW_MS;

    const newest = indices
      .flatMap(({ index, 'creation.date': createdAt }) =>
        index ? [{ name: index, createdAt: Number(createdAt) }] : []
      )
      .filter(({ createdAt }) => createdAt > cutoff)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!newest) {
      return null;
    }

    const { name, createdAt } = newest;
    const { count } = await client.asCurrentUser.count({ index: name });

    return {
      indexName: name,
      documentsCount: count,
      sizeInBytes: meteredIndices.find((index) => index.name === name)?.size_in_bytes ?? 0,
      createdAt,
    };
  } catch (error) {
    logger.warn(`Failed to fetch the new index for vectordb deployment stats: ${error.message}`);
    return null;
  }
};

/**
 * Fetches the deployment's index-level stats. Elasticsearch scopes the index, size, and document
 * counts to the caller. The cluster-wide vector count is not scoped to the caller, so it needs
 * index `monitor` over every index. The newest index reads its creation date from `_cat/indices`,
 * which needs the cluster `monitor` privilege. Each stat is read independently and surfaced as
 * `null` on failure, so callers can tell "unavailable" from a genuine `0` and one dead source
 * cannot hide the rest.
 */
export const fetchIndexStats = async (
  client: IScopedClusterClient,
  logger: Logger,
  { canMonitorAllIndices, canMonitorCluster }: MonitorPrivileges
): Promise<IndexStats> => {
  try {
    const meteredIndices = await fetchMeteredIndices(client).catch((error) => {
      logger.warn(
        `Failed to fetch metering stats for vectordb deployment stats. Returning partial stats: ${error.message}`
      );
      return null;
    });

    const indicesCount = meteredIndices?.length ?? null;
    const storeSizeBytes =
      meteredIndices?.reduce(
        (sum, { size_in_bytes: sizeInBytes }) => sum + (sizeInBytes ?? 0),
        0
      ) ?? null;

    if (indicesCount === 0) {
      return {
        indicesCount,
        storeSizeBytes,
        vectorCount: canMonitorAllIndices ? 0 : null,
        documentsCount: 0,
        newIndex: null,
      };
    }

    const [vectorCount, documentsCount, newIndex] = await Promise.all([
      canMonitorAllIndices
        ? countVectors(client, logger).catch((error) => {
            logger.warn(
              `Failed to compute vector count for vectordb deployment stats. Returning partial stats: ${error.message}`
            );
            return null;
          })
        : Promise.resolve(null),
      countDocuments(client, logger).catch((error) => {
        logger.warn(
          `Failed to compute document count for vectordb deployment stats. Returning partial stats: ${error.message}`
        );
        return null;
      }),
      canMonitorCluster
        ? fetchNewIndex(client, logger, meteredIndices ?? [])
        : Promise.resolve(null),
    ]);

    return { indicesCount, storeSizeBytes, vectorCount, documentsCount, newIndex };
  } catch (error) {
    logger.warn(`Failed to fetch index stats for vectordb deployment stats: ${error.message}`);
    return INDEX_STATS_UNAVAILABLE;
  }
};

/**
 * Keys that Kibana creates on a user's behalf — task manager, alerting, and other internal keys.
 * The `Alerting: ` name prefix covers keys created before `metadata.managed` was introduced.
 */
const MANAGED_KEY_FILTERS = [
  { prefix: { name: { value: 'Alerting: ' } } },
  { term: { 'metadata.managed': true } },
];

/**
 * Mirrors the default view of the Stack Management API keys list, which the card links out to:
 * non-invalidated `rest` keys minus the ones Kibana manages. Without the same exclusions the card
 * reports keys the user cannot see in that list.
 */
const USER_API_KEYS_QUERY = {
  bool: {
    must: [{ term: { invalidated: false } }, { term: { type: 'rest' } }],
    must_not: MANAGED_KEY_FILTERS,
  },
};

const EXPIRING_SOON_WINDOW = '30d';

/**
 * Fetches API key stats: total keys visible to the caller and those expiring within
 * `EXPIRING_SOON_WINDOW`. Returns `null` values on failure.
 */
export const fetchApiKeysStats = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<ApiKeysStats> => {
  try {
    const { total, aggregations } = await client.asCurrentUser.security.queryApiKeys({
      size: 0,
      query: USER_API_KEYS_QUERY,
      aggs: {
        expiring: {
          filter: { range: { expiration: { gt: 'now', lte: `now+${EXPIRING_SOON_WINDOW}` } } },
        },
      },
    });

    const expiringAggregation = aggregations?.expiring;
    const expiring =
      expiringAggregation && 'doc_count' in expiringAggregation ? expiringAggregation.doc_count : 0;

    return { total, expiring };
  } catch (error) {
    logger.warn(`Failed to fetch API keys stats for vectordb deployment stats: ${error.message}`);
    return { total: null, expiring: null };
  }
};
