/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ModelProvider } from '@kbn/agent-builder-server';
import { compact, groupBy, mapValues, uniq } from 'lodash';
import { selectRelevantFields } from './select_relevant_fields';
import { getFieldType } from './utils';
import { timeRangeFilter, kqlFilter as toKqlFilter } from '../../utils/dsl_filters';
import { parseDatemath } from '../../utils/time';

export interface IndexFieldsResult {
  fieldsByType: Record<string, string[]>;
  message?: string;
}

/** Threshold above which LLM filtering is applied */
const LLM_FILTER_THRESHOLD = 100;

/** Minimum number of documents to sample for field discovery */
const MIN_SAMPLE_SIZE = 1000;

/** Maximum docs to return from top_hits within sampler */
const MAX_TOP_HITS = 1000;

/**
 * Extracts all field paths from a nested object.
 * e.g., { a: { b: 1, c: 2 } } -> ['a.b', 'a.c']
 */
function extractFieldPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return extractFieldPaths(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

/**
 * Extracts unique field paths from an array of document sources.
 */
function extractFieldsFromDocs(docs: Array<{ _source?: unknown }>): string[] {
  const fieldPaths = docs
    .map((hit) => hit._source)
    .filter(
      (source): source is Record<string, unknown> => source != null && typeof source === 'object'
    )
    .flatMap((source) => extractFieldPaths(source));

  return uniq(fieldPaths);
}

/**
 * Samples documents using random_sampler aggregation to get a diverse sample.
 * Calculates probability to ensure at least MIN_SAMPLE_SIZE documents.
 */
async function getFieldNamesWithData(
  esClient: IScopedClusterClient,
  index: string,
  start: string,
  end: string,
  kqlFilter: string | undefined,
  logger: Logger
): Promise<string[]> {
  const query: QueryDslQueryContainer = {
    bool: {
      filter: [
        ...timeRangeFilter('@timestamp', {
          start: parseDatemath(start),
          end: parseDatemath(end, { roundUp: true }),
        }),
        ...toKqlFilter(kqlFilter),
      ],
    },
  };

  // Step 1: Get total document count within time range
  const countResponse = await esClient.asCurrentUser.count({
    index,
    query,
    ignore_unavailable: true,
    allow_no_indices: true,
  });

  const totalDocs = countResponse.count;

  if (totalDocs === 0) {
    return [];
  }

  // Step 2: Determine sampling strategy
  // random_sampler probability must be between 0.0-0.5 or exactly 1.0
  const probability = MIN_SAMPLE_SIZE / totalDocs;

  if (probability >= 0.5) {
    // Need >= 50% of docs: fetch directly without sampling
    const fetchSize = Math.min(totalDocs, MIN_SAMPLE_SIZE * 2);
    const response = await esClient.asCurrentUser.search({
      index,
      query,
      size: fetchSize,
      _source: true,
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    return extractFieldsFromDocs(response.hits.hits);
  }

  // Large index: use random_sampler for diverse sampling (probability < 0.5)
  logger.debug(
    `Sampling ${index}: ${totalDocs} total docs, using probability ${probability.toFixed(4)}`
  );

  const response = await esClient.asCurrentUser.search({
    index,
    query,
    size: 0,
    ignore_unavailable: true,
    allow_no_indices: true,
    aggs: {
      sample: {
        random_sampler: {
          probability,
        },
        aggs: {
          docs: {
            top_hits: {
              size: MAX_TOP_HITS,
              _source: true,
            },
          },
        },
      },
    },
  });

  const sampleAgg = response.aggregations?.sample as {
    docs?: { hits?: { hits?: Array<{ _source?: Record<string, unknown> }> } };
  };
  const sampledDocs = sampleAgg?.docs?.hits?.hits ?? [];

  logger.debug(`Sampled ${sampledDocs.length} documents from ${index}`);

  return extractFieldsFromDocs(sampledDocs);
}

/**
 * Gets field types for a list of field names using fieldCaps API.
 * Returns array of { name, type } objects for fields that exist.
 */
async function getFieldsWithTypes(
  esClient: IScopedClusterClient,
  index: string,
  fieldNames: string[]
) {
  const capsResponse = await esClient.asCurrentUser.fieldCaps({
    index,
    fields: fieldNames,
    ignore_unavailable: true,
    allow_no_indices: true,
    filters: '-metadata',
  });

  return compact(
    Object.entries(capsResponse.fields)
      .filter(([fieldName]) => !fieldName.startsWith('_'))
      .map(([fieldName, fieldTypes]) => {
        const type = getFieldType(fieldTypes);
        return type ? { name: fieldName, type } : undefined;
      })
  );
}

/**
 * Returns fields from a specific index pattern that have actual data, grouped by type.
 * Uses random sampling to discover populated fields (O(1) regardless of mapping field count).
 * When userIntentDescription is provided and field count exceeds threshold, uses LLM to filter.
 */
export async function getIndexFieldsHandler({
  esClient,
  index,
  userIntentDescription,
  start,
  end,
  kqlFilter,
  modelProvider,
  logger,
}: {
  esClient: IScopedClusterClient;
  index: string;
  userIntentDescription?: string;
  start: string;
  end: string;
  kqlFilter?: string;
  modelProvider: ModelProvider;
  logger: Logger;
}): Promise<IndexFieldsResult> {
  try {
    // Step 1: Sample documents to find fields with data
    const fieldNamesWithData = await getFieldNamesWithData(
      esClient,
      index,
      start,
      end,
      kqlFilter,
      logger
    );

    if (fieldNamesWithData.length === 0) {
      return {
        fieldsByType: {},
        message: 'No documents found in index or no fields with data.',
      };
    }

    // Step 2: Get field types for fields that have data
    let fieldsWithTypes = await getFieldsWithTypes(esClient, index, fieldNamesWithData);

    // Step 3: Apply LLM filtering if needed
    if (fieldsWithTypes.length > LLM_FILTER_THRESHOLD && userIntentDescription) {
      const { inferenceClient } = await modelProvider.getDefaultModel();
      fieldsWithTypes = await selectRelevantFields({
        userIntentDescription,
        candidateFields: fieldsWithTypes,
        inferenceClient,
        logger,
      });
    }

    // Step 4: Group field names by type
    const fieldsGroupedByType = groupBy(fieldsWithTypes, ({ type }) => type);
    const fieldsByType = mapValues(fieldsGroupedByType, (fields) => fields.map((f) => f.name));

    return { fieldsByType };
  } catch (error) {
    logger.debug(`Error getting index fields: ${error.message}`);
    return { fieldsByType: {} };
  }
}
