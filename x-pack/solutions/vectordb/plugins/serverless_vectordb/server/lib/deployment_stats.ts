/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

interface VectorStats {
  value_count?: number;
}

interface IndexStatsWithVectors {
  dense_vector?: VectorStats;
  sparse_vector?: VectorStats;
}

interface IndexStats {
  indicesCount: number | null;
  storeSizeBytes: number | null;
  vectorCount: number | null;
  documentsCount: number | null;
}

export const INDEX_STATS_UNAVAILABLE: IndexStats = {
  indicesCount: null,
  storeSizeBytes: null,
  vectorCount: null,
  documentsCount: null,
};

const USER_INDICES_PATTERN = ['*', '-.*'];

/**
 * Whether the caller may see cluster-wide totals. Every source behind `fetchIndexStats` runs with
 * elevated privileges, so Elasticsearch will not reject an unprivileged caller on its own and the
 * route has to ask on their behalf. Errors deny access rather than granting it.
 */
export const hasIndexManagePrivilege = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<boolean> => {
  try {
    const { has_all_requested: hasAllRequested } =
      await client.asCurrentUser.security.hasPrivileges({
        index: [{ names: ['*'], privileges: ['manage'] }],
      });

    return hasAllRequested;
  } catch (error) {
    logger.warn(
      `Failed to check index privileges for vectordb deployment stats. Denying access: ${error.message}`
    );
    return false;
  }
};

/**
 * Counts indexed dense + sparse vectors via `_stats` (operator-only in serverless), aggregated at
 * the cluster level. Excluding dot indices keeps the total scoped to the same indices as the
 * metering-derived index and size counts. `open` is already the default for `expand_wildcards`, but
 * is pinned so hidden indices can't be pulled in by a later edit.
 */
const countVectors = async (client: IScopedClusterClient): Promise<number> => {
  const stats = await client.asInternalUser.indices.stats({
    index: USER_INDICES_PATTERN,
    expand_wildcards: ['open'],
    level: 'cluster',
    metric: ['dense_vector', 'sparse_vector'],
  });

  const primaries = stats._all?.primaries as IndexStatsWithVectors | undefined;
  return (primaries?.dense_vector?.value_count ?? 0) + (primaries?.sparse_vector?.value_count ?? 0);
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
 * count, and top-level document count. Failures are logged and surfaced as `null` so callers can
 * distinguish "unavailable" from a genuine `0`.
 */
export const fetchIndexStats = async (
  client: IScopedClusterClient,
  logger: Logger
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

    let vectorCount: number | null = 0;
    let documentsCount: number | null = 0;

    if (indicesCount > 0) {
      [vectorCount, documentsCount] = await Promise.all([
        countVectors(client).catch((error) => {
          logger.warn(
            `Failed to compute vector count for vectordb deployment stats. Returning partial stats: ${error.message}`
          );
          return null;
        }),
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
