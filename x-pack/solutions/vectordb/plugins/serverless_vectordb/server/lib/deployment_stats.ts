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
}

const INDEX_STATS_UNAVAILABLE: IndexStats = {
  indicesCount: null,
  storeSizeBytes: null,
  vectorCount: null,
  documentsCount: null,
};

const USER_INDICES_PATTERN = ['*', '-.*'];

/**
 * Whether the caller may see the cluster-wide vector count. `countVectors` reads `indices.stats`
 * as the internal user, so Elasticsearch will not scope it to the caller and the route has to ask
 * on their behalf. `monitor` is the privilege that governs index stats, and requiring it over `*`
 * keeps a partially privileged caller from being shown totals that span indices they cannot see.
 * Errors deny access rather than granting it.
 */
export const hasIndexMonitorPrivilege = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<boolean> => {
  try {
    const { has_all_requested: hasAllRequested } =
      await client.asCurrentUser.security.hasPrivileges({
        index: [{ names: ['*'], privileges: ['monitor'] }],
      });

    return hasAllRequested;
  } catch (error) {
    logger.warn(
      `Failed to check index privileges for vectordb deployment stats. Denying access: ${error.message}`
    );
    return false;
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
 * Counts top-level documents via `_count`. This matches only root documents and reads a single
 * copy of each shard. It runs with the caller's own credentials because the internal user can only
 * read Kibana-owned patterns such as `kibana_sample_data_*`. Against a wildcard, that silently
 * resolves to whichever of those indices exist and undercounts instead of erroring. A failed-shard
 * result is reported as unavailable rather than as an undercount, since `_count` cannot opt out of
 * partial search results.
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
 * Fetches index-level stats: user index count, aggregate store size, indexed dense/sparse vector
 * count, and top-level document count. The index, size, and document counts are scoped to the
 * caller by Elasticsearch itself. The vector count is not scoped, so it is only read when the
 * caller has the `monitor` all indices privilege. Failures are logged and surfaced as `null`
 * so callers can distinguish "unavailable" from a genuine `0`.
 */
export const fetchIndexStats = async (
  client: IScopedClusterClient,
  logger: Logger,
  { canMonitorAllIndices }: { canMonitorAllIndices: boolean }
): Promise<IndexStats> => {
  try {
    const meteringStats = await client.asSecondaryAuthUser.transport.request<MeteringStatsResponse>(
      {
        method: 'GET',
        path: '/_metering/stats',
      }
    );

    const userIndices = (meteringStats.indices ?? []).filter(
      (index) => !index.name.startsWith('.')
    );

    const indicesCount = userIndices.length;
    const storeSizeBytes = userIndices.reduce((sum, index) => sum + (index.size_in_bytes ?? 0), 0);

    let vectorCount: number | null = canMonitorAllIndices ? 0 : null;
    let documentsCount: number | null = 0;

    if (indicesCount > 0) {
      [vectorCount, documentsCount] = await Promise.all([
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
      ]);
    }

    return { indicesCount, storeSizeBytes, vectorCount, documentsCount };
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
