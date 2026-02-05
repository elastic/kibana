/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ModelProvider } from '@kbn/agent-builder-server';
import { compact, groupBy, mapValues, uniq } from 'lodash';
import { selectRelevantFields } from './select_relevant_fields';
import { getFieldType } from './get_field_type';
import { timeRangeFilter, kqlFilter as toKqlFilter } from '../../utils/dsl_filters';
import { parseDatemath } from '../../utils/time';

export interface IndexFieldsResult {
  fieldsByType: Record<string, string[]>;
  message?: string;
}

/** Threshold above which LLM filtering is applied */
const MIN_FIELDS_FOR_INTENT_FILTERING = 100;

/** Number of documents to sample for field discovery */
const SAMPLE_SIZE = 1000;

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
 * Fetches documents and extracts unique field names.
 * Uses a simple search to get up to SAMPLE_SIZE documents.
 */
async function getFieldNamesWithData(
  esClient: IScopedClusterClient,
  index: string,
  start: string,
  end: string,
  kqlFilter: string | undefined,
  logger: Logger
): Promise<string[]> {
  const response = await esClient.asCurrentUser.search({
    index,
    size: SAMPLE_SIZE,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', {
            start: parseDatemath(start),
            end: parseDatemath(end, { roundUp: true }),
          }),
          ...toKqlFilter(kqlFilter),
        ],
      },
    },
    _source: true,
    ignore_unavailable: true,
    allow_no_indices: true,
  });

  const docs = response.hits.hits;
  logger.debug(`Sampled ${docs.length} documents from ${index}`);

  // Extract field paths from documents
  const fieldPaths = docs
    .map((hit) => hit._source)
    .filter(
      (source): source is Record<string, unknown> => source != null && typeof source === 'object'
    )
    .flatMap((source) => extractFieldPaths(source));

  return uniq(fieldPaths);
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
 * Samples up to 1000 documents to discover populated fields.
 * When userIntentDescription is provided and field count exceeds threshold, uses LLM to filter.
 */
export async function listFieldsHandler({
  esClient,
  index,
  intent,
  start,
  end,
  kqlFilter,
  modelProvider,
  logger,
}: {
  esClient: IScopedClusterClient;
  index: string;
  intent?: string;
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
    if (fieldsWithTypes.length > MIN_FIELDS_FOR_INTENT_FILTERING && intent) {
      const { inferenceClient } = await modelProvider.getDefaultModel();
      fieldsWithTypes = await selectRelevantFields({
        intent,
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
    logger.error(`Error getting index fields for "${index}": ${error.message}`);
    return {
      fieldsByType: {},
      message: `Failed to discover fields: ${error.message}`,
    };
  }
}
