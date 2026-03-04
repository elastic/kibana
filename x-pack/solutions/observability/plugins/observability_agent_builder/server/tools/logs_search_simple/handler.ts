/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { parseDatemath } from '../../utils/time';
import { DEFAULT_KEEP_FIELDS, MAX_CELL_VALUE_LENGTH } from './constants';

export interface LogsSearchSimpleParams {
  start: string;
  end: string;
  index: string;
  kqlFilter?: string;
  limit: number;
  bucketSize: string;
  breakdownField?: string;
}

export interface HistogramBucket {
  bucket: string;
  count: number;
  breakdown?: string;
}

export interface LogSample {
  _id?: string;
  _index?: string;
  [key: string]: unknown;
}

export interface LogsSearchSimpleResult {
  histogram: HistogramBucket[];
  totalCount: number;
  samples: LogSample[];
}

export async function logsSearchSimpleHandler({
  esClient,
  params,
}: {
  esClient: ElasticsearchClient;
  params: LogsSearchSimpleParams;
}): Promise<LogsSearchSimpleResult> {
  const { start, end, index, kqlFilter, limit, bucketSize, breakdownField } = params;

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });
  if (!startMs || !endMs) {
    throw new Error(`Invalid date range: start="${start}", end="${end}"`);
  }

  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();

  const histogramGroupBy = breakdownField
    ? `bucket = BUCKET(@timestamp, ${bucketSize}), ${breakdownField}`
    : `bucket = BUCKET(@timestamp, ${bucketSize})`;

  const filterClause = kqlFilter ? `| WHERE KQL("${escapeKql(kqlFilter)}")` : '';

  const query = [
    `FROM ${index} METADATA _id, _index`,
    `| WHERE @timestamp >= TO_DATETIME("${startIso}") AND @timestamp <= TO_DATETIME("${endIso}")`,
    filterClause,
    `| FORK`,
    `  (STATS count = COUNT(*) BY ${histogramGroupBy} | SORT bucket)`,
    `  (STATS total = COUNT(*))`,
    `  (SORT @timestamp DESC | LIMIT ${limit})`,
  ]
    .filter(Boolean)
    .join('\n');

  const result = await runEsqlQuery(esClient, query);
  return parseForkedResult(result, breakdownField);
}

interface EsqlResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

async function runEsqlQuery(esClient: ElasticsearchClient, query: string): Promise<EsqlResult> {
  const response = await esClient.transport.request<EsqlResult>({
    method: 'POST',
    path: '/_query?format=json&drop_null_columns=true',
    body: { query },
  });

  return {
    columns: response.columns ?? [],
    values: response.values ?? [],
  };
}

function parseForkedResult(result: EsqlResult, breakdownField?: string): LogsSearchSimpleResult {
  if (!result.columns?.length || !result.values?.length) {
    return { histogram: [], totalCount: 0, samples: [] };
  }

  const forkColIdx = result.columns.findIndex((c) => c.name === '_fork');
  if (forkColIdx < 0) {
    return { histogram: [], totalCount: 0, samples: [] };
  }

  const grouped = groupByFork(result, forkColIdx);

  const histogram = parseHistogram(grouped.fork1, breakdownField);
  const totalCount = parseTotalCount(grouped.fork2);
  const samples = parseSamples(grouped.fork3);

  return { histogram, totalCount, samples };
}

const MAX_BREAKDOWN_VALUES = 10;

function parseHistogram(fork: EsqlResult | undefined, breakdownField?: string): HistogramBucket[] {
  if (!fork?.values.length) {
    return [];
  }

  const countIdx = fork.columns.findIndex((c) => c.name === 'count');
  const bucketIdx = fork.columns.findIndex((c) => c.name === 'bucket');
  const breakdownIdx = breakdownField
    ? fork.columns.findIndex((c) => c.name === breakdownField)
    : -1;

  if (countIdx < 0 || bucketIdx < 0) {
    return [];
  }

  if (breakdownIdx < 0) {
    return fork.values.map((row) => ({
      bucket: String(row[bucketIdx] ?? ''),
      count: Number(row[countIdx]) || 0,
    }));
  }

  const topBreakdownValues = getTopBreakdownValues(fork.values, countIdx, breakdownIdx);

  const otherBuckets = new Map<string, number>();
  const entries: HistogramBucket[] = [];

  for (const row of fork.values) {
    const breakdownValue = String(row[breakdownIdx] ?? 'unknown');
    const bucket = String(row[bucketIdx] ?? '');
    const count = Number(row[countIdx]) || 0;

    if (topBreakdownValues.has(breakdownValue)) {
      entries.push({ bucket, count, breakdown: breakdownValue });
    } else {
      otherBuckets.set(bucket, (otherBuckets.get(bucket) ?? 0) + count);
    }
  }

  for (const [bucket, count] of otherBuckets) {
    entries.push({ bucket, count, breakdown: '_other' });
  }

  return entries.sort((a, b) => a.bucket.localeCompare(b.bucket));
}

function getTopBreakdownValues(
  rows: unknown[][],
  countIdx: number,
  breakdownIdx: number
): Set<string> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[breakdownIdx] ?? 'unknown');
    totals.set(key, (totals.get(key) ?? 0) + (Number(row[countIdx]) || 0));
  }

  return new Set(
    [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_BREAKDOWN_VALUES)
      .map(([key]) => key)
  );
}

function parseTotalCount(fork: EsqlResult | undefined): number {
  if (!fork?.values.length) {
    return 0;
  }
  const totalIdx = fork.columns.findIndex((c) => c.name === 'total');
  if (totalIdx < 0) {
    return 0;
  }
  return Number(fork.values[0][totalIdx]) || 0;
}

const SAMPLE_FIELDS = new Set(['_id', '_index', '@timestamp', ...DEFAULT_KEEP_FIELDS]);

function parseSamples(fork: EsqlResult | undefined): LogSample[] {
  if (!fork?.values.length) {
    return [];
  }

  return fork.values.map((row) => {
    const sample: LogSample = {};
    for (let i = 0; i < fork.columns.length; i++) {
      const col = fork.columns[i].name;
      const value = row[i];
      if (value != null && SAMPLE_FIELDS.has(col)) {
        sample[col] = truncateCellValue(value);
      }
    }
    return sample;
  });
}

interface GroupedForkResult {
  [forkId: string]: EsqlResult;
}

function groupByFork(result: EsqlResult, forkColIdx: number): GroupedForkResult {
  const grouped: GroupedForkResult = {};

  const columnsWithoutFork = result.columns.filter((_, i) => i !== forkColIdx);

  for (const row of result.values) {
    const forkId = String(row[forkColIdx] ?? 'unknown');
    if (!grouped[forkId]) {
      grouped[forkId] = { columns: columnsWithoutFork, values: [] };
    }
    grouped[forkId].values.push(row.filter((_, i) => i !== forkColIdx));
  }

  return grouped;
}

function truncateCellValue(value: unknown): unknown {
  if (typeof value === 'string' && value.length > MAX_CELL_VALUE_LENGTH) {
    return value.slice(0, MAX_CELL_VALUE_LENGTH) + '...';
  }
  return value;
}

function escapeKql(kql: string): string {
  return kql.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
