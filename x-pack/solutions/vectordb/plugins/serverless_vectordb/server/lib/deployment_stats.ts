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
  vectorDocsCount: number | null;
  documentsCount: number | null;
}

const INDEX_STATS_UNAVAILABLE: IndexStats = {
  indicesCount: null,
  storeSizeBytes: null,
  vectorDocsCount: null,
  documentsCount: null,
};

// Caps indices per ES|QL query so the `FROM` clause can't grow unbounded.
const ESQL_INDICES_PER_QUERY = 500;

const countTopLevelDocs = async (
  client: IScopedClusterClient,
  indexNames: string[]
): Promise<number> => {
  let total = 0;

  for (let i = 0; i < indexNames.length; i += ESQL_INDICES_PER_QUERY) {
    const batch = indexNames.slice(i, i + ESQL_INDICES_PER_QUERY);
    const esqlResult = await client.asCurrentUser.esql.query({
      query: `FROM ${batch.map((name) => `"${name}"`).join(',')} | STATS doc_count = COUNT(*)`,
      allow_partial_results: true,
    });

    const countColumnIndex = esqlResult.columns.findIndex((col) => col.name === 'doc_count');
    const [row] = esqlResult.values ?? [];
    total += (row?.[countColumnIndex] as number) ?? 0;
  }

  return total;
};

/**
 * Counts indexed dense + sparse vectors via `_stats` (operator-only in serverless).
 * Uses cluster-level aggregation across all indices visible to asInternalUser.
 */
const countVectors = async (
  client: IScopedClusterClient,
  indexNames: string[]
): Promise<number> => {
  const stats = await client.asInternalUser.indices.stats({
    level: 'cluster',
    metric: ['dense_vector', 'sparse_vector'],
  });

  const primaries = stats._all?.primaries as IndexStatsWithVectors | undefined;
  return (primaries?.dense_vector?.value_count ?? 0) + (primaries?.sparse_vector?.value_count ?? 0);
};

/**
 * Fetches index-level stats: user index count, aggregate store size, top-level document count,
 * and indexed dense/sparse vector count. Failures are logged and surfaced as `null`
 * so callers can distinguish "unavailable" from a genuine `0`.
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

    let documentsCount: number | null = 0;
    let vectorDocsCount: number | null = 0;

    if (indicesCount > 0) {
      const indexNames = userIndices.map((i) => i.name);

      // `_metering/stats` num_docs counts Lucene documents, which includes the nested chunk
      // documents that `semantic_text` fields generate, inflating the count. Count top-level
      // documents with ES|QL instead, matching the index management plugin's workaround.
      try {
        documentsCount = await countTopLevelDocs(client, indexNames);
      } catch (error) {
        logger.warn(
          `Failed to compute document count for vectordb deployment stats. Returning partial stats: ${error.message}`
        );
        documentsCount = null;
      }

      try {
        vectorDocsCount = await countVectors(client, indexNames);
      } catch (error) {
        // Index/size counts are still valid; only the vector count is unavailable.
        logger.warn(
          `Failed to compute vector count for vectordb deployment stats. Returning partial stats: ${error.message}`
        );
        vectorDocsCount = null;
      }
    }

    return { indicesCount, storeSizeBytes, vectorDocsCount, documentsCount };
  } catch (error) {
    logger.warn(`Failed to fetch index stats for vectordb deployment stats: ${error.message}`);
    return INDEX_STATS_UNAVAILABLE;
  }
};

interface ApiKeysStats {
  total: number | null;
  expiring: number | null;
}

/**
 * Fetches API key stats for the current user: total non-invalidated keys and those
 * with an upcoming expiration. Returns `null` values on failure.
 */
export const fetchApiKeysStats = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<ApiKeysStats> => {
  try {
    const result = await client.asCurrentUser.security.getApiKey({ owner: true });
    const keys = result.api_keys ?? [];
    const now = Date.now();
    const activeKeys = keys.filter((k) => !k.invalidated);
    const total = activeKeys.length;
    const expiring = activeKeys.filter(
      (k) => k.expiration !== undefined && k.expiration > now
    ).length;
    return { total, expiring };
  } catch (error) {
    logger.warn(`Failed to fetch API keys stats for vectordb deployment stats: ${error.message}`);
    return { total: null, expiring: null };
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
