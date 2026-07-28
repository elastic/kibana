/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { IScopedClusterClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FieldCapsFieldCapability, Indices } from '@elastic/elasticsearch/lib/api/types';

// The inference flags aren't yet in the Elasticsearch package types.
type FieldCapability = FieldCapsFieldCapability & {
  inference?: boolean;
  non_inference_indices?: Indices;
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
  vectorsCount: number | null;
}

const INDEX_STATS_UNAVAILABLE: IndexStats = {
  indicesCount: null,
  storeSizeBytes: null,
  vectorsCount: null,
};

const VECTOR_FIELD_TYPES = new Set(['dense_vector', 'sparse_vector', 'semantic_text', 'semantic']);

// `semantic_text` fields may be reported by field caps as `text` with `inference: true`, so `text`
// must be requested alongside the vector types.
const FIELD_CAPS_TYPES = [...VECTOR_FIELD_TYPES, 'text'];

// A `semantic_text` field indexes its embeddings in internal nested chunk subfields, which field
// caps reports as vector fields of their own. They belong to their parent field, so counting them
// would report a single `semantic_text` value as several vectors.
const SEMANTIC_TEXT_CHUNK_FIELD = /\.inference\.chunks(\.|$)/;

const toIndexArray = (indices: Indices | undefined): string[] | undefined => {
  if (indices === undefined) return undefined;
  return Array.isArray(indices) ? indices : [indices];
};

/**
 * Maps each of the given indices to the names of the vector fields it maps, omitting indices with
 * none. Uses `_field_caps` rather than full mappings as it's far lighter and flattens
 * nested/multi-fields for free.
 */
const getVectorFieldsByIndex = async (
  client: IScopedClusterClient,
  indexNames: string[]
): Promise<Map<string, Set<string>>> => {
  const fieldCaps = await client.asCurrentUser.fieldCaps({
    index: indexNames,
    fields: '*',
    types: FIELD_CAPS_TYPES,
    filters: '-metadata',
    // Forces partially-mapped fields to carry an explicit `indices` list. Without it a field mapped
    // in a subset of indices looks identical to one mapped everywhere, misclassifying all indices.
    include_unmapped: true,
  });

  const vectorFieldsByIndex = new Map<string, Set<string>>();

  for (const [fieldName, capabilitiesByType] of Object.entries(fieldCaps.fields)) {
    if (SEMANTIC_TEXT_CHUNK_FIELD.test(fieldName)) continue;

    for (const capability of Object.values(capabilitiesByType) as FieldCapability[]) {
      // `include_unmapped: true` adds pseudo-entries listing indices where the field is absent.
      if (capability.type === 'unmapped') continue;

      // A field mapped as `semantic_text` in some indices and plain `text` in others collapses into
      // a single `text` capability with `inference: false`, because both share the `text` type
      // family and `inference` only reports `true` when it holds for every index. The indices where
      // the field is *not* an inference field are listed in `non_inference_indices`, so its mere
      // presence means the field is a vector field in the remaining indices.
      const nonInferenceIndices = toIndexArray(capability.non_inference_indices);

      const isVectorField =
        VECTOR_FIELD_TYPES.has(capability.type) ||
        capability.inference === true ||
        nonInferenceIndices !== undefined;
      if (!isVectorField) continue;

      // Absent `indices` means the field is mapped in every requested index.
      const capabilityIndices = toIndexArray(capability.indices) ?? indexNames;

      for (const name of capabilityIndices) {
        if (nonInferenceIndices?.includes(name)) continue;

        const fields = vectorFieldsByIndex.get(name);
        if (fields) fields.add(fieldName);
        else vectorFieldsByIndex.set(name, new Set([fieldName]));
      }
    }
  }

  return vectorFieldsByIndex;
};

// Caps indices per search so a single request can't fan out over an unbounded number of shards.
const INDICES_PER_SEARCH = 500;

interface VectorCountSearch {
  indices: string[];
  fields: string[];
}

type VectorFieldAggregations = Record<string, { doc_count: number }>;

/**
 * Plans the searches needed to count vector values. Indices mapping the same vector fields are
 * counted together, as one search can only scope its aggregations to its whole index list.
 */
const planVectorCountSearches = (
  vectorFieldsByIndex: Map<string, Set<string>>
): VectorCountSearch[] => {
  const searchesByFields = new Map<string, VectorCountSearch>();

  for (const [indexName, fields] of vectorFieldsByIndex) {
    const sortedFields = [...fields].sort();
    const key = JSON.stringify(sortedFields);
    const search = searchesByFields.get(key);

    if (search) search.indices.push(indexName);
    else searchesByFields.set(key, { indices: [indexName], fields: sortedFields });
  }

  return [...searchesByFields.values()].flatMap(({ indices, fields }) =>
    chunk(indices, INDICES_PER_SEARCH).map((batch) => ({ indices: batch, fields }))
  );
};

/**
 * Counts how many vector fields hold a value across all documents: a document populating three of
 * its vector fields contributes three. A `semantic_text` field counts once however many chunks it
 * is split into.
 */
const countVectorValues = async (
  client: IScopedClusterClient,
  vectorFieldsByIndex: Map<string, Set<string>>
): Promise<number> => {
  let total = 0;

  for (const { indices, fields } of planVectorCountSearches(vectorFieldsByIndex)) {
    // An `exists` filter per field yields the number of documents in which that field holds a
    // value. Aggregations only see top-level documents, so unlike `_metering/stats` num_docs they
    // aren't inflated by the nested chunk documents that `semantic_text` fields generate.
    const response = await client.asCurrentUser.search<unknown, VectorFieldAggregations>({
      index: indices,
      size: 0,
      track_total_hits: false,
      // Indices reported by metering may be deleted before this runs.
      ignore_unavailable: true,
      aggs: Object.fromEntries(
        fields.map((field, i) => [`vector_field_${i}`, { filter: { exists: { field } } }])
      ),
    });

    for (const { doc_count: docCount } of Object.values(response.aggregations ?? {})) {
      total += docCount;
    }
  }

  return total;
};

/**
 * Fetches index-level stats: user index count, aggregate store size, and the number of populated
 * vector fields across all documents. Failures are logged and surfaced as `null` so callers can
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

    let vectorsCount: number | null = 0;
    if (indicesCount > 0) {
      const indexNames = userIndices.map((i) => i.name);

      try {
        const vectorFieldsByIndex = await getVectorFieldsByIndex(client, indexNames);

        if (vectorFieldsByIndex.size > 0) {
          vectorsCount = await countVectorValues(client, vectorFieldsByIndex);
        }
      } catch (error) {
        // Index/size counts are still valid; only the vector count is unavailable.
        logger.warn(
          `Failed to compute vector count for vectordb deployment stats. Returning partial stats: ${error.message}`
        );
        vectorsCount = null;
      }
    }

    return { indicesCount, storeSizeBytes, vectorsCount };
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
