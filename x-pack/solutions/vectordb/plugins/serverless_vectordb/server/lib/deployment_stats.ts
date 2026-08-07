/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';

// The `inference` flag isn't yet in the Elasticsearch package types.
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
 * Returns which of the given indices contain a vector field. Uses `_field_caps` rather than full
 * mappings as it's far lighter and flattens nested/multi-fields for free.
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
    // Forces partially-mapped fields to carry an explicit `indices` list. Without it a field mapped
    // in a subset of indices looks identical to one mapped everywhere, misclassifying all indices.
    include_unmapped: true,
  });

  const vectorIndexNames = new Set<string>();

  for (const capabilitiesByType of Object.values(fieldCaps.fields)) {
    for (const capability of Object.values(capabilitiesByType) as FieldCapability[]) {
      // `include_unmapped: true` adds pseudo-entries listing indices where the field is absent.
      if (capability.type === 'unmapped') continue;

      const isVectorField =
        VECTOR_FIELD_TYPES.has(capability.type) || capability.inference === true;
      if (!isVectorField) continue;

      // Absent `indices` means the field is mapped in every requested index.
      if (capability.indices === undefined) return indexNames;

      const capabilityIndices = Array.isArray(capability.indices)
        ? capability.indices
        : [capability.indices];
      capabilityIndices.forEach((name) => vectorIndexNames.add(name));

      if (vectorIndexNames.size === indexNames.length) return indexNames;
    }
  }

  return [...vectorIndexNames];
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
 * Fetches index-level stats: user index count, aggregate store size, and doc count across indices
 * with a vector field. Failures are logged and surfaced as `null` so callers can
 * distinguish "unavailable" from a genuine `0`.
 */
export const fetchIndexStats = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<IndexStats> => {
  try {
    // Serverless-only `_metering/stats` requires asSecondaryAuthUser.
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

    let vectorDocsCount: number | null = 0;
    if (indicesCount > 0) {
      const indexNames = userIndices.map((i) => i.name);

      try {
        const vectorIndexNames = await getVectorIndexNames(client, indexNames);

        if (vectorIndexNames.length > 0) {
          // `_metering/stats` num_docs counts Lucene documents, which includes the nested chunk
          // documents that `semantic_text` fields generate, inflating the count. Count top-level
          // documents with ES|QL instead, matching the index management plugin's workaround.
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
