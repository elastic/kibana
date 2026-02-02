/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { groupBy, keyBy, mapValues } from 'lodash';
import { getTypedSearch } from '../../utils/get_typed_search';
import { timeRangeFilter, kqlFilter as toKqlFilter } from '../../utils/dsl_filters';
import { parseDatemath } from '../../utils/time';
import { getFieldType } from './get_field_type';

const MAX_KEYWORD_VALUES = 50;
const MAX_TEXT_SAMPLES = 5;
const MAX_CHARS_PER_SAMPLE = 500;

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
const BOOLEAN_TYPES = ['boolean'];
const TEXT_TYPES = ['text', 'match_only_text'];

interface KeywordFieldResult {
  type: 'keyword';
  field: string;
  values: string[];
  hasMoreValues: boolean;
}
interface NumericFieldResult {
  type: 'numeric';
  field: string;
  min: number;
  max: number;
}
interface DateFieldResult {
  type: 'date';
  field: string;
  min: string;
  max: string;
}
interface BooleanFieldResult {
  type: 'boolean';
  field: string;
}
interface TextFieldResult {
  type: 'text';
  field: string;
  samples: string[];
}
interface UnsupportedFieldResult {
  type: 'unsupported';
  field: string;
  fieldType: string;
}
interface FieldErrorResult {
  type: 'error';
  field: string;
  message: string;
}

export interface FieldValuesRecordResult {
  fields: Record<
    string,
    | KeywordFieldResult
    | NumericFieldResult
    | DateFieldResult
    | BooleanFieldResult
    | TextFieldResult
    | UnsupportedFieldResult
    | FieldErrorResult
  >;
}

/** Gets distinct values for a single keyword field via termsEnum with optional filtering */
async function getKeywordFieldValues(
  esClient: IScopedClusterClient,
  index: string,
  field: string,
  queryFilter?: QueryDslQueryContainer
): Promise<KeywordFieldResult | FieldErrorResult> {
  try {
    const { terms } = await esClient.asCurrentUser.termsEnum({
      index,
      field,
      size: MAX_KEYWORD_VALUES + 1,
      index_filter: queryFilter,
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
  fields: string[],
  queryFilter?: QueryDslQueryContainer
): Promise<Record<string, NumericFieldResult | FieldErrorResult>> {
  if (fields.length === 0) return {};

  const search = getTypedSearch(esClient.asCurrentUser);
  const response = await search({
    index,
    size: 0,
    track_total_hits: false,
    query: queryFilter,
    aggs: Object.fromEntries(fields.map((field) => [field, { stats: { field } }])),
  });

  return keyBy(
    fields.map((field): NumericFieldResult | FieldErrorResult => {
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
  fields: string[],
  queryFilter?: QueryDslQueryContainer
): Promise<Record<string, DateFieldResult | FieldErrorResult>> {
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
    query: queryFilter,
    aggs,
  });

  return keyBy(
    fields.map((field): DateFieldResult | FieldErrorResult => {
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

/** Gets sample values for multiple text fields in a single request */
async function getTextFieldSampleValues(
  esClient: IScopedClusterClient,
  index: string,
  fields: string[],
  queryFilter?: QueryDslQueryContainer
): Promise<Record<string, TextFieldResult | FieldErrorResult>> {
  if (fields.length === 0) return {};

  const response = await esClient.asCurrentUser.search({
    index,
    size: MAX_TEXT_SAMPLES,
    track_total_hits: false,
    query: queryFilter,
    _source: false,
    fields,
  });

  return Object.fromEntries(
    fields.map((field): [string, TextFieldResult | FieldErrorResult] => {
      const samples = response.hits.hits
        .flatMap((hit) => hit.fields?.[field] ?? [])
        .filter((v): v is string => typeof v === 'string')
        .slice(0, MAX_TEXT_SAMPLES)
        .map((v) => (v.length > MAX_CHARS_PER_SAMPLE ? v.slice(0, MAX_CHARS_PER_SAMPLE) + '…' : v));

      if (samples.length === 0) {
        return [field, { type: 'error', field, message: 'No text values found' }];
      }
      return [field, { type: 'text', field, samples }];
    })
  );
}

/** Converts a wildcard pattern to a regex */
function wildcardToRegex(pattern: string): RegExp {
  return new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);
}

/** Determines the category for a field type */
function getFieldCategory(
  fieldType: string
): 'keyword' | 'numeric' | 'date' | 'boolean' | 'text' | 'unsupported' {
  if (KEYWORD_TYPES.includes(fieldType)) return 'keyword';
  if (NUMERIC_TYPES.includes(fieldType)) return 'numeric';
  if (DATE_TYPES.includes(fieldType)) return 'date';
  if (BOOLEAN_TYPES.includes(fieldType)) return 'boolean';
  if (TEXT_TYPES.includes(fieldType)) return 'text';
  return 'unsupported';
}

interface ResolvedValidField {
  field: string;
  fieldType: string;
  category: ReturnType<typeof getFieldCategory>;
}
interface ResolvedErrorField {
  input: string;
  error: string;
}
type ResolvedField = ResolvedValidField | ResolvedErrorField;

/** Resolves an input (field name or wildcard) to concrete fields or an error */
function resolveInputToConcreteFields(
  input: string,
  allFieldNames: string[],
  fieldNameToTypeMap: Record<string, string | undefined>
): ResolvedField[] {
  const isWildcard = input.includes('*');
  const matchingFields = isWildcard
    ? allFieldNames.filter((f) => wildcardToRegex(input).test(f) && fieldNameToTypeMap[f])
    : fieldNameToTypeMap[input]
    ? [input]
    : [];

  if (matchingFields.length === 0) {
    return [
      {
        input,
        error: isWildcard ? `No fields match pattern "${input}"` : `Field "${input}" not found`,
      },
    ];
  }

  return matchingFields.map((field) => ({
    field,
    fieldType: fieldNameToTypeMap[field]!,
    category: getFieldCategory(fieldNameToTypeMap[field]!),
  }));
}

/**
 * Field value discovery - returns values/ranges for multiple fields.
 * Batches requests by field type to minimize ES calls.
 * Supports wildcard patterns in field names (e.g., "attributes.*").
 */
export async function getFieldValuesHandler({
  esClient,
  index,
  fields,
  start,
  end,
  kqlFilter,
}: {
  esClient: IScopedClusterClient;
  index: string;
  fields: string[];
  start: string;
  end: string;
  kqlFilter?: string;
}): Promise<FieldValuesRecordResult> {
  const queryFilter = {
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

  // fieldCaps expands wildcards and returns field types
  // Note: also returns parent object fields from passthrough types (filtered out below)
  const capsResponse = await esClient.asCurrentUser.fieldCaps({
    index,
    fields,
    ignore_unavailable: true,
    allow_no_indices: true,
    index_filter: queryFilter,
  });

  // Map field names to their concrete types (undefined for object/nested/unmapped)
  const fieldNameToTypeMap = mapValues(capsResponse.fields, getFieldType);
  const allFieldNames = Object.keys(fieldNameToTypeMap);

  // Resolve all inputs to concrete fields or errors
  const concreteFields = fields.flatMap((input) =>
    resolveInputToConcreteFields(input, allFieldNames, fieldNameToTypeMap)
  );
  const errors = concreteFields.filter((r): r is ResolvedErrorField => 'error' in r);
  const validFields = concreteFields.filter((r): r is ResolvedValidField => 'field' in r);

  // Group valid fields by category
  const byCategory = groupBy(validFields, (r) => r.category);
  const keywordFields = (byCategory.keyword ?? []).map((r) => r.field);
  const numericFields = (byCategory.numeric ?? []).map((r) => r.field);
  const dateFields = (byCategory.date ?? []).map((r) => r.field);
  const booleanFields = (byCategory.boolean ?? []).map((r) => r.field);
  const textFields = (byCategory.text ?? []).map((r) => r.field);
  const unsupportedFields = byCategory.unsupported ?? [];

  // Fetch values in parallel by type
  const [keywordResults, numericResults, dateResults, textResults] = await Promise.all([
    Promise.all(keywordFields.map((f) => getKeywordFieldValues(esClient, index, f, queryFilter))),
    getNumericFieldValuesBatch(esClient, index, numericFields, queryFilter),
    getDateFieldValuesBatch(esClient, index, dateFields, queryFilter),
    getTextFieldSampleValues(esClient, index, textFields, queryFilter),
  ]);

  const errorResults = Object.fromEntries(
    errors.map((e) => [e.input, { type: 'error' as const, field: e.input, message: e.error }])
  );
  const unsupportedResults = Object.fromEntries(
    unsupportedFields.map((r) => [
      r.field,
      { type: 'unsupported' as const, field: r.field, fieldType: r.fieldType },
    ])
  );
  const booleanResults = Object.fromEntries(
    booleanFields.map((f) => [f, { type: 'boolean' as const, field: f }])
  );

  return {
    fields: {
      ...errorResults,
      ...unsupportedResults,
      ...booleanResults,
      ...keyBy(keywordResults, 'field'),
      ...numericResults,
      ...dateResults,
      ...textResults,
    },
  };
}
