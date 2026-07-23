/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';

// Extend the field capability type to include the `inference` flag until the Elasticsearch package version is updated.
type FieldCapability = FieldCapsFieldCapability & {
  inference?: boolean;
};

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
  vectorDocsCount: number | null;
}

const INDEX_STATS_UNAVAILABLE: IndexStats = {
  indicesCount: null,
  storeSizeBytes: null,
  vectorDocsCount: null,
};

const VECTOR_FIELD_TYPES = new Set(['dense_vector', 'sparse_vector', 'semantic_text', 'semantic']);

// `semantic_text` fields may be reported by field caps as `text` with `inference: true`, so `text`
// must be requested alongside the vector types.
const FIELD_CAPS_TYPES = [...VECTOR_FIELD_TYPES, 'text'];

/**
 * Determines which of the given indices contain a vector field (`dense_vector`, `sparse_vector`, or
 * an inference field such as `semantic_text` / `semantic`).
 *
 * Uses `_field_caps`, which is far lighter than pulling full mappings: it aggregates fields across
 * indices and dedupes shared ones, and flattens nested/multi-fields for free. Inference fields are
 * detected via the `inference` flag, which serverless Elasticsearch always reports.
 */
const getVectorIndexNames = async (
  client: IScopedClusterClient,
  indexNames: string[]
): Promise<string[]> => {
  const fieldCaps = await client.asCurrentUser.fieldCaps({
    index: indexNames,
    fields: '*',
    types: FIELD_CAPS_TYPES,
    filters: '-metadata',
  });

  const vectorIndexNames = new Set<string>();

  for (const capabilitiesByType of Object.values(fieldCaps.fields)) {
    for (const capability of Object.values(capabilitiesByType) as FieldCapability[]) {
      const isVectorField =
        VECTOR_FIELD_TYPES.has(capability.type) || capability.inference === true;
      if (!isVectorField) continue;

      // `indices` is only populated when the field is not uniform across the requested indices; when
      // absent, the field (with this capability) exists in every requested index, so all of them
      // qualify and there is nothing left to discover.
      if (capability.indices === undefined) return indexNames;

      const capabilityIndices = Array.isArray(capability.indices)
        ? capability.indices
        : [capability.indices];
      capabilityIndices.forEach((name) => vectorIndexNames.add(name));

      // Every requested index is already known to contain a vector field so exit early and return all indexes.
      if (vectorIndexNames.size === indexNames.length) return indexNames;
    }
  }

  return [...vectorIndexNames];
};

// Caps the number of indices per ES|QL query so the `FROM` clause cannot grow unbounded on
// deployments with very many vector indices.
const ESQL_INDICES_PER_QUERY = 500;

/**
 * Counts top-level documents across the given indices with ES|QL, batching the index list so a
 * single query never targets an unbounded number of indices.
 */
const countTopLevelDocs = async (
  client: IScopedClusterClient,
  indexNames: string[]
): Promise<number> => {
  let total = 0;

  for (let i = 0; i < indexNames.length; i += ESQL_INDICES_PER_QUERY) {
    const batch = indexNames.slice(i, i + ESQL_INDICES_PER_QUERY);
    const esqlResult = await client.asCurrentUser.esql.query({
      // Index names are quoted so names requiring ES|QL quoting cannot break the query. Double
      // quotes cannot appear in index names, so no escaping is needed.
      query: `FROM ${batch.map((name) => `"${name}"`).join(',')} | STATS count()`,
      // return partial results instead of failing when some shards are unavailable
      allow_partial_results: true,
    });

    const countColumnIndex = esqlResult.columns.findIndex((col) => col.name === 'count()');
    const [row] = esqlResult.values ?? [];
    total += (row?.[countColumnIndex] as number) ?? 0;
  }

  return total;
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
        const vectorIndexNames = await getVectorIndexNames(client, indexNames);

        if (vectorIndexNames.length > 0) {
          // `_metering/stats` num_docs counts Lucene documents, which includes the nested chunk
          // documents that `semantic_text` fields generate — inflating the count (e.g. 10 docs
          // reported as 20). Count top-level documents with ES|QL instead, matching the workaround
          // used by the index management plugin.
          vectorDocsCount = await countTopLevelDocs(client, vectorIndexNames);
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
