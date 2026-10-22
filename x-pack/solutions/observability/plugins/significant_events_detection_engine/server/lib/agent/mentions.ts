/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlRow } from '../esql';

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * True when an evidence row names the service as a whole word, outside the row's own
 * `service.name`: a log line such as "dependency failed: catalogue" or "edge-cache returned 503".
 */
export function mentions(rows: EsqlRow[], service: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegExp(service)}\\b`, 'i');
  return rows.some((row) =>
    Object.entries(row).some(
      ([column, value]) => column !== 'service.name' && pattern.test(String(value))
    )
  );
}

/**
 * Tokens that look like request or trace ids: ten or more hex characters, optionally with a
 * numeric suffix (`361094d326-370680`). Timestamps and counters do not match.
 */
const ID_TOKEN = /\b[0-9a-f]{10,}(?:-[0-9a-f]+)?\b/gi;

/** Every id-like token in some text, lower-cased. */
export function idTokens(text: string): string[] {
  return [...new Set((text.match(ID_TOKEN) ?? []).map((token) => token.toLowerCase()))];
}

/** Columns that carry what a request did: its message and its trace or request id. */
const REQUEST_COLUMN = /^(message|body\.text|trace\.id|trace_id|.*request[._]id)$/;

/**
 * Id-like tokens of each row, from its request columns only: host, container and run ids are
 * the same on every line of a service, so they say nothing about a request.
 */
export function requestTokens(rows: EsqlRow[]): string[][] {
  return rows.map((row) =>
    Object.entries(row)
      .filter(([column]) => REQUEST_COLUMN.test(column))
      .flatMap(([, value]) => idTokens(String(value)))
  );
}

/** Tokens found in at most half of the rows: a request id, not something every line carries. */
function rareTokens(rows: EsqlRow[]): Set<string> {
  const perRow = requestTokens(rows);
  const counts = perRow
    .flatMap((tokens) => [...new Set(tokens)])
    .reduce(
      (count, token) => count.set(token, (count.get(token) ?? 0) + 1),
      new Map<string, number>()
    );
  return new Set(
    [...counts].filter(([, count]) => count * 2 <= Math.max(rows.length, 2)).map(([token]) => token)
  );
}

/**
 * Id-like tokens two sets of rows share. The same request or trace id failing in two services
 * is a row that links them.
 */
export function sharedIds(left: EsqlRow[], right: EsqlRow[]): string[] {
  const rightTokens = rareTokens(right);
  return [...rareTokens(left)].filter((token) => rightTokens.has(token));
}
