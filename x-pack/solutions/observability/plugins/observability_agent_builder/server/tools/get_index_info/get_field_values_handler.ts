/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { keyBy, mapValues } from 'lodash';
import { getTypedSearch } from '../../utils/get_typed_search';
import { getFieldType } from './utils';

const MAX_KEYWORD_VALUES = 50;
const KEYWORD_TYPES = ['keyword', 'constant_keyword', 'ip'];
const NUMERIC_TYPES = [
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'unsigned_long',
];
const DATE_TYPES = ['date', 'date_nanos'];

type FieldValuesResult =
  | { type: 'keyword'; field: string; values: string[]; hasMoreValues: boolean }
  | { type: 'numeric'; field: string; min: number; max: number }
  | { type: 'date'; field: string; min: string; max: string }
  | { type: 'unsupported'; field: string; fieldType: string }
  | { type: 'error'; field: string; message: string };

export interface MultiFieldValuesResult {
  fields: Record<string, FieldValuesResult>;
}

/** Gets distinct values for a single keyword field via termsEnum (no batch API available) */
async function getKeywordFieldValues(
  esClient: IScopedClusterClient,
  index: string,
  field: string
): Promise<FieldValuesResult> {
  try {
    const { terms } = await esClient.asCurrentUser.termsEnum({
      index,
      field,
      size: MAX_KEYWORD_VALUES + 1,
    });

    return {
      type: 'keyword',
      field,
      values: terms.slice(0, MAX_KEYWORD_VALUES),
      hasMoreValues: terms.length > MAX_KEYWORD_VALUES,
    };
  } catch (error) {
    return { type: 'error', field, message: error.message };
  }
}

/** Gets min/max for multiple numeric fields in a single request */
async function getNumericFieldValuesBatch(
  esClient: IScopedClusterClient,
  index: string,
  fields: string[]
): Promise<Record<string, FieldValuesResult>> {
  if (fields.length === 0) return {};

  const search = getTypedSearch(esClient.asCurrentUser);
  const response = await search({
    index,
    size: 0,
    track_total_hits: false,
    aggs: Object.fromEntries(fields.map((field) => [field, { stats: { field } }])),
  });

  return keyBy(
    fields.map((field): FieldValuesResult => {
      const stats = response.aggregations?.[field];
      if (stats?.min != null && stats?.max != null) {
        return { type: 'numeric', field, min: stats.min, max: stats.max };
      }
      return { type: 'error', field, message: 'No numeric values found' };
    }),
    'field'
  );
}

/** Gets min/max for multiple date fields in a single request */
async function getDateFieldValuesBatch(
  esClient: IScopedClusterClient,
  index: string,
  fields: string[]
): Promise<Record<string, FieldValuesResult>> {
  if (fields.length === 0) return {};

  const aggs = Object.fromEntries(
    fields.flatMap((field) => [
      [`${field}_min`, { min: { field } }],
      [`${field}_max`, { max: { field } }],
    ])
  ) as Record<string, { min: { field: string } } | { max: { field: string } }>;

  const search = getTypedSearch(esClient.asCurrentUser);
  const response = await search({
    index,
    size: 0,
    track_total_hits: false,
    aggs,
  });

  return keyBy(
    fields.map((field): FieldValuesResult => {
      const minAgg = response.aggregations?.[`${field}_min`];
      const maxAgg = response.aggregations?.[`${field}_max`];
      if (minAgg?.value_as_string && maxAgg?.value_as_string) {
        return { type: 'date', field, min: minAgg.value_as_string, max: maxAgg.value_as_string };
      }
      return { type: 'error', field, message: 'No date values found' };
    }),
    'field'
  );
}

/**
 * Field value discovery - returns values/ranges for multiple fields.
 * Batches requests by field type to minimize ES calls:
 * - 1 fieldCaps call for type detection
 * - 1 search call for all numeric fields (batched stats aggs)
 * - 1 search call for all date fields (batched min/max aggs)
 * - N parallel termsEnum calls for keyword fields (no batch API)
 */
export async function getFieldValuesHandler({
  esClient,
  index,
  fields,
}: {
  esClient: IScopedClusterClient;
  index: string;
  fields: string[];
}): Promise<MultiFieldValuesResult> {
  // Get field types for ALL fields in a single call
  const capsResponse = await esClient.asCurrentUser.fieldCaps({
    index,
    fields,
    ignore_unavailable: true,
    allow_no_indices: true,
  });
  const fieldTypes = mapValues(capsResponse.fields, getFieldType);

  // Group fields by type
  const keywordFields: string[] = [];
  const numericFields: string[] = [];
  const dateFields: string[] = [];
  const skippedFields: Record<string, FieldValuesResult> = {};

  for (const field of fields) {
    const fieldType = fieldTypes[field];
    if (!fieldType) {
      skippedFields[field] = { type: 'error', field, message: `Field "${field}" not found` };
    } else if (KEYWORD_TYPES.includes(fieldType)) {
      keywordFields.push(field);
    } else if (NUMERIC_TYPES.includes(fieldType)) {
      numericFields.push(field);
    } else if (DATE_TYPES.includes(fieldType)) {
      dateFields.push(field);
    } else {
      skippedFields[field] = { type: 'unsupported', field, fieldType };
    }
  }

  // Batch requests by type (runs in parallel)
  const [keywordResults, numericResults, dateResults] = await Promise.all([
    Promise.all(keywordFields.map((field) => getKeywordFieldValues(esClient, index, field))),
    getNumericFieldValuesBatch(esClient, index, numericFields),
    getDateFieldValuesBatch(esClient, index, dateFields),
  ]);

  return {
    fields: {
      ...skippedFields,
      ...keyBy(keywordResults, 'field'),
      ...numericResults,
      ...dateResults,
    },
  };
}
