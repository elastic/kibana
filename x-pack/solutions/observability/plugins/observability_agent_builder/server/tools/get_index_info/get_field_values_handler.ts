/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { mapValues } from 'lodash';
import { getTypedSearch, type TypedSearch } from '../../utils/get_typed_search';
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
  [key: string]: unknown;
}

/** Gets distinct values for keyword fields via termsEnum */
async function getKeywordFieldValues({
  esClient,
  index,
  field,
}: {
  esClient: IScopedClusterClient;
  index: string;
  field: string;
}): Promise<FieldValuesResult> {
  const enumResponse = await esClient.asCurrentUser.termsEnum({
    index,
    field,
    size: MAX_KEYWORD_VALUES + 1,
  });
  const terms = enumResponse.terms;
  return {
    type: 'keyword',
    field,
    values: terms.slice(0, MAX_KEYWORD_VALUES),
    hasMoreValues: terms.length > MAX_KEYWORD_VALUES,
  };
}

/** Gets min/max for numeric fields via stats aggregation */
async function getNumericFieldValues({
  search,
  index,
  field,
}: {
  search: TypedSearch;
  index: string;
  field: string;
}): Promise<FieldValuesResult> {
  const statsResponse = await search({
    index,
    size: 0,
    track_total_hits: false,
    aggs: { stats: { stats: { field } } },
  });
  const stats = statsResponse.aggregations?.stats;
  if (stats?.min != null && stats?.max != null) {
    return { type: 'numeric', field, min: stats.min, max: stats.max };
  }
  return { type: 'error', field, message: 'No numeric values found' };
}

/** Gets min/max for date fields via min/max aggregations */
async function getDateFieldValues({
  search,
  index,
  field,
}: {
  search: TypedSearch;
  index: string;
  field: string;
}): Promise<FieldValuesResult> {
  const dateResponse = await search({
    index,
    size: 0,
    track_total_hits: false,
    aggs: {
      min_date: { min: { field } },
      max_date: { max: { field } },
    },
  });
  const minAgg = dateResponse.aggregations?.min_date;
  const maxAgg = dateResponse.aggregations?.max_date;
  if (minAgg?.value_as_string && maxAgg?.value_as_string) {
    return { type: 'date', field, min: minAgg.value_as_string, max: maxAgg.value_as_string };
  }
  return { type: 'error', field, message: 'No date values found' };
}

/**
 * Field value discovery - returns distinct values for keyword fields.
 * Calls fieldCaps once for all fields, then termsEnum in parallel for keywords.
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

  // Create search client once for all aggregation queries
  const search = getTypedSearch(esClient.asCurrentUser);

  // Process each field based on its type
  const results = await Promise.all(
    fields.map(async (field): Promise<[string, FieldValuesResult]> => {
      const fieldType = fieldTypes[field];

      if (!fieldType) {
        return [field, { type: 'error', field, message: `Field "${field}" not found` }];
      }

      try {
        if (KEYWORD_TYPES.includes(fieldType)) {
          return [field, await getKeywordFieldValues({ esClient, index, field })];
        }

        if (NUMERIC_TYPES.includes(fieldType)) {
          return [field, await getNumericFieldValues({ search, index, field })];
        }

        if (DATE_TYPES.includes(fieldType)) {
          return [field, await getDateFieldValues({ search, index, field })];
        }

        return [field, { type: 'unsupported', field, fieldType }];
      } catch (error) {
        return [field, { type: 'error', field, message: error.message }];
      }
    })
  );

  return { fields: Object.fromEntries(results) };
}
