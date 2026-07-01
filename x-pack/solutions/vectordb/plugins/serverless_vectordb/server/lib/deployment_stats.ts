/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

interface MappingProperty {
  type?: string;
  properties?: Record<string, MappingProperty>;
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

export interface IndexStats {
  indicesCount: number | null;
  storeSizeBytes: number | null;
  vectorDocsCount: number | null;
}

const INDEX_STATS_UNAVAILABLE: IndexStats = {
  indicesCount: null,
  storeSizeBytes: null,
  vectorDocsCount: null,
};

const VECTOR_FIELD_TYPES = new Set(['dense_vector', 'sparse_vector', 'semantic_text']);

export const containsVectorField = (properties?: Record<string, MappingProperty>): boolean => {
  if (!properties) return false;
  for (const value of Object.values(properties)) {
    if (value.type && VECTOR_FIELD_TYPES.has(value.type)) return true;
    if (value.properties && containsVectorField(value.properties)) return true;
  }
  return false;
};

/**
 * Fetches index-level stats for the deployment: total user index count, aggregate store size, and
 * the number of documents living in indices that contain a vector field.
 *
 * Never throws: any failure is logged and surfaced as `null` for the affected value so callers can
 * distinguish "unavailable" from a genuine `0`, and so a single failing call doesn't fail the whole
 * stats response.
 */
export const fetchIndexStats = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<IndexStats> => {
  try {
    // Serverless-only `_metering/stats` returns docs + size for all user indices.
    // Requires asSecondaryAuthUser.
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

    // A deployment with no user indices genuinely has 0 vector docs.
    let vectorDocsCount: number | null = 0;
    if (indicesCount > 0) {
      const indexNames = userIndices.map((i) => i.name);

      try {
        const mappings = await client.asCurrentUser.indices.getMapping({ index: indexNames });
        const vectorIndexNames = Object.entries(mappings)
          .filter(([, mapping]) =>
            containsVectorField(mapping.mappings?.properties as Record<string, MappingProperty>)
          )
          .map(([name]) => name);

        if (vectorIndexNames.length > 0) {
          // `_metering/stats` num_docs counts Lucene documents, which includes the nested chunk
          // documents that `semantic_text` fields generate — inflating the count (e.g. 10 docs
          // reported as 20). Count top-level documents with ES|QL instead, matching the workaround
          // used by the index management plugin.
          const esqlResult = await client.asCurrentUser.esql.query({
            query: `FROM ${vectorIndexNames.join(',')} | STATS count()`,
            // return partial results instead of failing when some shards are unavailable
            allow_partial_results: true,
          });
          const countColumnIndex = esqlResult.columns.findIndex((col) => col.name === 'count()');
          vectorDocsCount = (esqlResult.values ?? []).reduce(
            (sum, row) => sum + ((row[countColumnIndex] as number) ?? 0),
            0
          );
        }
      } catch (error) {
        // Index/size counts are still valid; only the vector doc count is unavailable.
        logger.warn(
          `Failed to compute vector doc count for vectordb deployment stats. Returning partial stats: ${error.message}`
        );
        vectorDocsCount = null;
      }
    }

    return { indicesCount, storeSizeBytes, vectorDocsCount };
  } catch (error) {
    logger.warn(`Failed to fetch index stats for vectordb deployment stats: ${error.message}`);
    return INDEX_STATS_UNAVAILABLE;
  }
};

/**
 * Fetches the number of dashboards in the current space. Never throws: returns `null` (and logs) on
 * failure so a dashboard lookup error is distinguishable from "0 dashboards" and doesn't fail the
 * whole stats response.
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
