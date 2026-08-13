/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

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
}

export const INDEX_STATS_UNAVAILABLE: IndexStats = {
  indicesCount: null,
  storeSizeBytes: null,
  vectorCount: null,
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
        index: [{ names: USER_INDICES_PATTERN, privileges: ['manage'] }],
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
 * the cluster level so no per-index breakdown is returned. Excluding dot indices keeps the total
 * scoped to the same indices as the metering-derived index and size counts. `open` is already the
 * default for `expand_wildcards`, but is pinned so hidden indices can't be pulled in by a later
 * edit.
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
 * Fetches index-level stats: user index count, aggregate store size, and indexed dense/sparse
 * vector count. Failures are logged and surfaced as `null` so callers can distinguish
 * "unavailable" from a genuine `0`.
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

    if (indicesCount > 0) {
      try {
        vectorCount = await countVectors(client);
      } catch (error) {
        // Index/size counts are still valid; only the vector count is unavailable.
        logger.warn(
          `Failed to compute vector count for vectordb deployment stats. Returning partial stats: ${error.message}`
        );
        vectorCount = null;
      }
    }

    return { indicesCount, storeSizeBytes, vectorCount };
  } catch (error) {
    logger.warn(`Failed to fetch index stats for vectordb deployment stats: ${error.message}`);
    return INDEX_STATS_UNAVAILABLE;
  }
};

/**
 * Fetches the number of dashboards in the current space. Returns `null` on failure so
 * a lookup error is distinguishable from "0 dashboards".
 */
export const fetchDashboardsCount = async (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
): Promise<number | null> => {
  try {
    const result = await savedObjectsClient.find({ type: 'dashboard', perPage: 0 });
    return result.total;
  } catch (error) {
    logger.warn(`Failed to fetch dashboard count for vectordb deployment stats: ${error.message}`);
    return null;
  }
};
