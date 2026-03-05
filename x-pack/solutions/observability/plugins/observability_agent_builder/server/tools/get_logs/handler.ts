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
import { parseDatemath } from '../../utils/time';
import { MAX_CELL_VALUE_LENGTH } from './constants';

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

interface GetLogsResult {
  histogram: HistogramBucket[];
  totalCount: number;
  samples: LogSample[];
}

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

  return parseForkedResult(result, groupByField, fields);
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
  const SAFE_INDEX_PATTERN = /^[a-zA-Z0-9_.*,:\-]+$/;
  if (!SAFE_INDEX_PATTERN.test(index)) {
    throw new Error(`Invalid index pattern: "${index}"`);
  }

  const SAFE_BUCKET_SIZE =
    /^\d+(milliseconds?|ms|seconds?|s|minutes?|m|hours?|h|days?|d|weeks?|w|months?|mo|quarters?|q|years?|y)$/i;
  if (!SAFE_BUCKET_SIZE.test(bucketSize)) {
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

const EMPTY_RESULT: GetLogsResult = { histogram: [], totalCount: 0, samples: [] };

function parseForkedResult(
  result: ESQLSearchResponse,
  groupByField: string | undefined,
  fields: string[]
): GetLogsResult {
  if (!result.columns?.length || !result.values?.length) {
    return EMPTY_RESULT;
  }

  const forkColumnIndex = result.columns.findIndex((column) => column.name === '_fork');
  if (forkColumnIndex < 0) {
    return EMPTY_RESULT;
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
        .map(([name, value]) => [name, truncateCellValue(value)])
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

function truncateCellValue(value: unknown): unknown {
  if (typeof value === 'string' && value.length > MAX_CELL_VALUE_LENGTH) {
    return value.slice(0, MAX_CELL_VALUE_LENGTH) + '...';
  }
  return value;
}
