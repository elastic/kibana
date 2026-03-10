/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { sanitazeESQLInput } from '@kbn/esql-utils';
import { groupBy, mapValues, orderBy, sortBy, sumBy } from 'lodash';
import moment from 'moment';
import { computeSamplingProbability } from '../../utils/compute_sampling_probability';
import { timeRangeFilter, kqlFilter as kqlFilterToDsl } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import { parseDatemath } from '../../utils/time';
import { FACET_FIELDS, MAX_FIELD_VALUE_LENGTH } from './constants';

export function getDefaultBucketSize(startMs: number, endMs: number): string {
  const duration = moment.duration(endMs - startMs, 'ms');
  const bucketSizeSeconds = Math.max(calculateAuto.near(30, duration)?.asSeconds() ?? 0, 1);
  return `${bucketSizeSeconds}s`;
}

interface GetLogsParams {
  start: string;
  end: string;
  index: string;
  kqlFilter?: string;
  limit: number;
  bucketSize: string;
  groupBy?: string;
  fields: string[];
}

interface HistogramBucket {
  bucket: string;
  count: number;
  group?: string;
}

interface LogSample {
  _id?: string;
  _index?: string;
  [key: string]: unknown;
}

interface LogCategory {
  pattern: string;
  count: number;
  sample: LogSample;
}

interface TopValueEntry {
  value: string;
  count: number;
}

export interface GetLogsResult {
  histogram: HistogramBucket[];
  totalCount: number;
  samples: LogSample[];
  categories: LogCategory[];
  topValues: Record<string, TopValueEntry[]>;
}

const MAX_CATEGORIES = 30;
const CATEGORIZATION_SAMPLE_SIZE = 10_000;

export async function getLogsHandler({
  esClient,
  params,
}: {
  esClient: ElasticsearchClient;
  params: GetLogsParams;
}): Promise<GetLogsResult> {
  const { start, end, index, kqlFilter, limit, bucketSize, groupBy: groupByField, fields } = params;

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });
  if (!startMs || !endMs) {
    throw new Error(`Invalid date range: start="${start}", end="${end}"`);
  }

  const query = buildEsqlQuery({
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
    index,
    kqlFilter,
    limit,
    bucketSize,
    groupBy: groupByField,
  });

  const result = (await esClient.esql.query({
    query,
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;

  const { histogram, totalCount, samples } = parseForkedResult(result, groupByField, fields);

  const { categories, topValues } = await getCategoriesAndTopValues({
    esClient,
    index,
    startMs,
    endMs,
    kqlFilter,
    totalCount,
    fields,
  });

  return { histogram, totalCount, samples, categories, topValues };
}

function buildEsqlQuery({
  startIso,
  endIso,
  index,
  kqlFilter,
  limit,
  bucketSize,
  groupBy: groupByField,
}: {
  startIso: string;
  endIso: string;
  index: string;
  kqlFilter?: string;
  limit: number;
  bucketSize: string;
  groupBy?: string;
}): string {
  if (!isValidIndexPattern(index)) {
    throw new Error(`Invalid index pattern: "${index}"`);
  }

  if (!isValidBucketSize(bucketSize)) {
    throw new Error(`Invalid bucket size: "${bucketSize}"`);
  }

  const histogramByClause = groupByField
    ? `bucket = BUCKET(@timestamp, ${bucketSize}), ${sanitazeESQLInput(groupByField)}`
    : `bucket = BUCKET(@timestamp, ${bucketSize})`;

  const filterClause = kqlFilter ? `| WHERE KQL("""${kqlFilter}""")` : '';

  return [
    `FROM ${index} METADATA _id, _index`,
    `| WHERE @timestamp >= TO_DATETIME("${startIso}") AND @timestamp <= TO_DATETIME("${endIso}")`,
    filterClause,
    `| FORK`,
    `  (STATS count = COUNT(*) BY ${histogramByClause} | SORT bucket)`,
    `  (STATS total = COUNT(*))`,
    `  (SORT @timestamp DESC | LIMIT ${limit})`,
  ]
    .filter(Boolean)
    .join('\n');
}

// ES|QL FORK produces three result sets identified by a `_fork` column.
// These constants map those IDs to their semantic meaning.
const FORK_ID_HISTOGRAM = 'fork1';
const FORK_ID_TOTAL_COUNT = 'fork2';
const FORK_ID_SAMPLES = 'fork3';

type ForkedResult = Omit<GetLogsResult, 'categories' | 'topValues'>;

const EMPTY_FORKED_RESULT: ForkedResult = { histogram: [], totalCount: 0, samples: [] };

function parseForkedResult(
  result: ESQLSearchResponse,
  groupByField: string | undefined,
  fields: string[]
): ForkedResult {
  if (!result.columns?.length || !result.values?.length) {
    return EMPTY_FORKED_RESULT;
  }

  const forkColumnIndex = result.columns.findIndex((column) => column.name === '_fork');
  if (forkColumnIndex < 0) {
    return EMPTY_FORKED_RESULT;
  }

  const resultsByForkId = splitResultByForkId(result, forkColumnIndex);

  const histogram = parseHistogram(resultsByForkId[FORK_ID_HISTOGRAM], groupByField);
  const totalCount = parseTotalCount(resultsByForkId[FORK_ID_TOTAL_COUNT]);
  const samples = parseSamples(resultsByForkId[FORK_ID_SAMPLES], fields);

  return { histogram, totalCount, samples };
}

const MAX_GROUP_BY_VALUES = 10;

function parseHistogram(
  fork: ESQLSearchResponse | undefined,
  groupByField?: string
): HistogramBucket[] {
  if (!fork?.values.length) {
    return [];
  }

  const countColumnIndex = fork.columns.findIndex((column) => column.name === 'count');
  const bucketColumnIndex = fork.columns.findIndex((column) => column.name === 'bucket');
  const groupByColumnIndex = groupByField
    ? fork.columns.findIndex((column) => column.name === groupByField)
    : -1;

  if (countColumnIndex < 0 || bucketColumnIndex < 0) {
    return [];
  }

  if (groupByColumnIndex < 0) {
    return fork.values.map((row) => ({
      bucket: String(row[bucketColumnIndex] ?? ''),
      count: Number(row[countColumnIndex]) || 0,
    }));
  }

  const topGroupByValues = getTopGroupByValues(fork.values, countColumnIndex, groupByColumnIndex);

  const topEntries = fork.values
    .filter((row) => topGroupByValues.has(String(row[groupByColumnIndex] ?? 'unknown')))
    .map((row) => ({
      bucket: String(row[bucketColumnIndex] ?? ''),
      count: Number(row[countColumnIndex]) || 0,
      group: String(row[groupByColumnIndex] ?? 'unknown'),
    }));

  const otherRows = fork.values.filter(
    (row) => !topGroupByValues.has(String(row[groupByColumnIndex] ?? 'unknown'))
  );
  const otherByBucket = groupBy(otherRows, (row) => String(row[bucketColumnIndex] ?? ''));
  const otherEntries = Object.entries(otherByBucket).map(([bucket, rows]) => ({
    bucket,
    count: sumBy(rows, (row) => Number(row[countColumnIndex]) || 0),
    group: '_other' as const,
  }));

  return sortBy([...topEntries, ...otherEntries], 'bucket');
}

function getTopGroupByValues(
  rows: unknown[][],
  countColumnIndex: number,
  groupByColumnIndex: number
): Set<string> {
  const grouped = groupBy(rows, (row) => String(row[groupByColumnIndex] ?? 'unknown'));
  const totalsByValue = mapValues(grouped, (groupRows) =>
    sumBy(groupRows, (row) => Number(row[countColumnIndex]) || 0)
  );

  return new Set(
    orderBy(Object.entries(totalsByValue), ([, total]) => total, 'desc')
      .slice(0, MAX_GROUP_BY_VALUES)
      .map(([key]) => key)
  );
}

function parseTotalCount(fork: ESQLSearchResponse | undefined): number {
  if (!fork?.values.length) {
    return 0;
  }
  const totalColumnIndex = fork.columns.findIndex((column) => column.name === 'total');
  if (totalColumnIndex < 0) {
    return 0;
  }
  return Number(fork.values[0][totalColumnIndex]) || 0;
}

const ALWAYS_INCLUDED_FIELDS = ['_id', '_index', '@timestamp'];

function parseSamples(fork: ESQLSearchResponse | undefined, fields: string[]): LogSample[] {
  if (!fork?.values.length) {
    return [];
  }

  const fieldsToInclude = new Set([...ALWAYS_INCLUDED_FIELDS, ...fields]);

  return fork.values.map((row) =>
    Object.fromEntries(
      fork.columns
        .map((col, i) => [col.name, row[i]] as const)
        .filter(([name, value]) => value != null && fieldsToInclude.has(name))
        .map(([name, value]) => [name, truncateFieldValue(value)])
    )
  );
}

function splitResultByForkId(
  result: ESQLSearchResponse,
  forkColumnIndex: number
): Record<string, ESQLSearchResponse> {
  const columnsWithoutFork = result.columns.filter((_, i) => i !== forkColumnIndex);
  const grouped = groupBy(result.values, (row) => String(row[forkColumnIndex] ?? 'unknown'));
  return mapValues(grouped, (rows) => ({
    columns: columnsWithoutFork,
    values: rows.map((row) => row.filter((_, i) => i !== forkColumnIndex)),
  }));
}

async function getCategoriesAndTopValues({
  esClient,
  index,
  startMs,
  endMs,
  kqlFilter,
  totalCount,
  fields,
}: {
  esClient: ElasticsearchClient;
  index: string;
  startMs: number;
  endMs: number;
  kqlFilter?: string;
  totalCount: number;
  fields: string[];
}): Promise<{ categories: LogCategory[]; topValues: Record<string, TopValueEntry[]> }> {
  if (totalCount === 0) {
    return { categories: [], topValues: {} };
  }

  const samplingProbability = computeSamplingProbability({
    totalHits: totalCount,
    targetSampleSize: CATEGORIZATION_SAMPLE_SIZE,
  });

  const sampleFields = [...new Set([...ALWAYS_INCLUDED_FIELDS, ...fields])];

  const search = getTypedSearch(esClient);

  const topValueAggs = Object.fromEntries(
    FACET_FIELDS.map((field) => [field, { terms: { field, size: 10 } }])
  );

  const response = await search({
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: startMs, end: endMs }),
          ...kqlFilterToDsl(kqlFilter),
          { exists: { field: 'message' } },
        ],
      },
    },
    aggregations: {
      sampler: {
        random_sampler: { probability: samplingProbability, seed: 1 },
        aggs: {
          categories: {
            categorize_text: {
              field: 'message',
              size: MAX_CATEGORIES,
              min_doc_count: 1,
            },
            aggs: {
              hit: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields: sampleFields,
                  sort: [{ '@timestamp': { order: 'desc' as const } }],
                },
              },
            },
          },
        },
      },
      ...topValueAggs,
    },
  });

  const categoryBuckets = response.aggregations?.sampler?.categories?.buckets ?? [];
  const categories = categoryBuckets.map((bucket) => {
    const hit = bucket.hit?.hits?.hits?.[0];
    const hitFields = hit
      ? Object.fromEntries(
          Object.entries(unwrapEsFields(hit.fields))
            .filter(([, value]) => value != null)
            .map(([name, value]) => [name, truncateFieldValue(value)])
        )
      : {};

    return {
      pattern: bucket.key,
      count: bucket.doc_count,
      sample: {
        _id: hit?._id,
        _index: hit?._index,
        ...hitFields,
      },
    };
  });

  const aggs = response.aggregations as
    | Record<string, { buckets: Array<{ key: string; doc_count: number }> }>
    | undefined;

  const topValues: Record<string, TopValueEntry[]> = {};
  for (const field of FACET_FIELDS) {
    const termsBuckets = aggs?.[field]?.buckets ?? [];
    if (termsBuckets.length > 0) {
      topValues[field] = termsBuckets.map((b) => ({
        value: String(b.key),
        count: b.doc_count,
      }));
    }
  }

  return { categories, topValues };
}

const SAFE_INDEX_PATTERN = /^[a-zA-Z0-9_.*,:\-]+$/;
function isValidIndexPattern(index: string): boolean {
  return SAFE_INDEX_PATTERN.test(index);
}

const SAFE_BUCKET_SIZE =
  /^\d+(milliseconds?|ms|seconds?|s|minutes?|m|hours?|h|days?|d|weeks?|w|months?|mo|quarters?|q|years?|y)$/i;
function isValidBucketSize(bucketSize: string): boolean {
  return SAFE_BUCKET_SIZE.test(bucketSize);
}

function truncateFieldValue(value: unknown): unknown {
  if (typeof value === 'string' && value.length > MAX_FIELD_VALUE_LENGTH) {
    return value.slice(0, MAX_FIELD_VALUE_LENGTH) + '...';
  }
  return value;
}
