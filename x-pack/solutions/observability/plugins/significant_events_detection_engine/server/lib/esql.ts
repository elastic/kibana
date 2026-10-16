/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';

export type EsqlRow = Record<string, unknown>;

/** No single engine query may hold a run longer than this. */
const DEFAULT_QUERY_TIMEOUT_MS = 30_000;

/** Runs an ES|QL query and returns rows keyed by column name. */
export async function queryRows({
  esClient,
  query,
  signal,
  timeoutMs = DEFAULT_QUERY_TIMEOUT_MS,
}: {
  esClient: ElasticsearchClient;
  query: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<{ columns: string[]; rows: EsqlRow[] }> {
  const response = (await esClient.esql.query(
    { query, drop_null_columns: false },
    { signal, requestTimeout: timeoutMs }
  )) as unknown as ESQLSearchResponse;
  const columns = response.columns.map((column) => column.name);
  const rows = response.values.map((values) =>
    Object.fromEntries(columns.map((column, index) => [column, values[index]]))
  );
  return { columns, rows };
}

/** Column names a source exposes, read with `LIMIT 0` so no data is scanned. */
export async function listColumns({
  esClient,
  from,
  signal,
}: {
  esClient: ElasticsearchClient;
  from: string;
  signal?: AbortSignal;
}): Promise<string[]> {
  const { columns } = await queryRows({ esClient, query: `FROM ${from} | LIMIT 0`, signal });
  return columns;
}

/** ES|QL string literal. JSON escaping matches ES|QL's double-quoted strings. */
export function esqlString(value: string): string {
  return JSON.stringify(value);
}

/** `@timestamp` filter for [from, to). */
export function timeRangeWhere(from: number, to: number): string {
  return `@timestamp >= TO_DATETIME(${esqlString(
    new Date(from).toISOString()
  )}) AND @timestamp < TO_DATETIME(${esqlString(new Date(to).toISOString())})`;
}

/** Escapes a field name when it needs backticks. */
export function field(name: string): string {
  return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(name) ? name : `\`${name.replace(/`/g, '``')}\``;
}

/** Start times of every bucket in [from, to). */
export function bucketStarts(from: number, to: number, bucketMs: number): number[] {
  const count = Math.max(0, Math.floor((to - from) / bucketMs));
  return Array.from({ length: count }, (_, index) => from + index * bucketMs);
}

/** Epoch milliseconds of an ES|QL date value, an ISO string or an epoch number. */
export function toEpoch(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  const text = String(value);
  return /^\d+$/.test(text) ? Number(text) : Date.parse(text);
}

export function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Number, or undefined when the column is null or missing. */
export function toOptionalNumber(value: unknown): number | undefined {
  return value === null || value === undefined ? undefined : toNumber(value);
}

/** First value of a possibly multi-valued column. */
export function firstValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : undefined;
  }
  return value === null || value === undefined ? undefined : String(value);
}

/** Short stable hash, for fingerprints built from free text. */
export function shortHash(text: string): string {
  // Polynomial rolling hash kept below 2^31 so it stays an exact integer.
  const hash = [...text].reduce(
    (accumulator, char) => (accumulator * 31 + char.charCodeAt(0)) % 2_147_483_647,
    7
  );
  return hash.toString(36);
}
