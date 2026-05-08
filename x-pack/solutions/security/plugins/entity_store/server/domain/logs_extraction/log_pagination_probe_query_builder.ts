/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  buildLogPageProbeSourceClause,
  TIMESTAMP_FIELD,
  type LogPageProbeSourceClauseParams,
  type LogSlicePaginationCursor,
} from './query_builder_commons';

/** Column produced by {@link buildLogPaginationCursorProbeEsql} via terminal `STATS COUNT(*)` over the `LIMIT maxLogsPerPage` stream — bounded; `=== maxLogsPerPage` is the saturation marker that signals "more pages may exist". */
export const LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD = 'total_logs';

/** Column produced by {@link buildLogPaginationCursorProbeEsql} via terminal `STATS MIN(@timestamp)` — used by the loop's stuck-detection guard to identify a tie group of `>= maxLogsPerPage` docs at one timestamp. */
export const LOG_PAGINATION_CURSOR_MIN_TIMESTAMP_FIELD = 'min_ts';

/**
 * Returns at most one row holding the slice-end cursor, the slice's minimum `@timestamp`, and a bounded count.
 *
 * Pipeline: `SORT @timestamp ASC | LIMIT maxLogsPerPage | STATS LAST(...) , MIN(...) , COUNT(*)`.
 * The single-key `SORT` lets ES|QL push the `TopN` down to Lucene on a time-sorted data stream
 * (the `_id` tiebreaker is gone — `_id` is read from Lucene stored fields per-doc and would
 * block index-order traversal). `LIMIT N` upstream of a terminal `STATS` keeps the count within
 * `[0, maxLogsPerPage]`, avoiding the full-window scan that an `INLINE STATS count(*)` upstream
 * of `LIMIT` would force (ES|QL forbids `LIMIT` before `INLINE STATS`). Output is one row, so
 * `esql.query.result_truncation_max_size` does not constrain `maxLogsPerPage`.
 *
 * `total_logs === maxLogsPerPage` is treated as "more pages may exist" — in the rare exact-fit
 * case the next iteration's probe returns 0 rows and the loop terminates with one extra
 * round-trip. `min_ts` lets the caller detect a tie group of docs that all share one
 * `@timestamp` (when `min_ts === slice-end @timestamp`) so it can break out via a 1ms cursor
 * bump if `>= maxLogsPerPage` docs share a single millisecond.
 */
export function buildLogPaginationCursorProbeEsql(
  params: LogPageProbeSourceClauseParams & { maxLogsPerPage: number }
): string {
  const { maxLogsPerPage, ...sourceParams } = params;
  return (
    buildLogPageProbeSourceClause(sourceParams) +
    `
  | SORT ${TIMESTAMP_FIELD} ASC
  | LIMIT ${maxLogsPerPage}
  | STATS ${TIMESTAMP_FIELD} = LAST(${TIMESTAMP_FIELD}, ${TIMESTAMP_FIELD}), ${LOG_PAGINATION_CURSOR_MIN_TIMESTAMP_FIELD} = MIN(${TIMESTAMP_FIELD}), ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} = COUNT(*)
  | KEEP ${TIMESTAMP_FIELD}, ${LOG_PAGINATION_CURSOR_MIN_TIMESTAMP_FIELD}, ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD}`
  );
}

export interface LogPaginationCursorParsedRow {
  logsPaginationCursor: LogSlicePaginationCursor;
  /** Earliest `@timestamp` in the slice (`MIN(@timestamp)` over the LIMITed stream). Equal to the cursor when the whole slice sits at one timestamp. */
  minTimestamp: string;
  /** Bounded count from terminal `STATS COUNT(*)` over the `LIMIT maxLogsPerPage` stream — values in `[0, maxLogsPerPage]`. */
  missingLogsToProcess: number;
}

export function parseLogPaginationCursorRow(
  esqlResponse: ESQLSearchResponse
): LogPaginationCursorParsedRow | undefined {
  if (esqlResponse.values.length === 0) {
    return undefined;
  }

  const tsIdx = esqlResponse.columns.findIndex(({ name }) => name === TIMESTAMP_FIELD);
  const minTsIdx = esqlResponse.columns.findIndex(
    ({ name }) => name === LOG_PAGINATION_CURSOR_MIN_TIMESTAMP_FIELD
  );
  const totalIdx = esqlResponse.columns.findIndex(
    ({ name }) => name === LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD
  );
  if (tsIdx === -1 || minTsIdx === -1 || totalIdx === -1) {
    throw new Error(
      `Expected ${TIMESTAMP_FIELD}, ${LOG_PAGINATION_CURSOR_MIN_TIMESTAMP_FIELD}, and ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} columns in log pagination cursor probe response`
    );
  }
  const row = esqlResponse.values[0];
  return {
    logsPaginationCursor: {
      timestampCursor: String(row[tsIdx]),
    },
    minTimestamp: String(row[minTsIdx]),
    missingLogsToProcess: Number(row[totalIdx]),
  };
}

export type LogPaginationCursor =
  | { hasLogsToProcess: false }
  | {
      hasLogsToProcess: true;
      logsPaginationCursor: LogSlicePaginationCursor;
      minTimestamp: string;
      isLastLogsPage: boolean;
    };

export function interpretLogPaginationCursorRows(
  row: LogPaginationCursorParsedRow | undefined,
  maxLogsPerPage: number
): LogPaginationCursor {
  if (row === undefined) {
    return { hasLogsToProcess: false };
  }
  const { logsPaginationCursor, minTimestamp, missingLogsToProcess } = row;
  // total_logs is bounded by LIMIT maxLogsPerPage. total_logs < maxLogsPerPage ⇒ window
  // exhausted by this slice; total_logs === maxLogsPerPage ⇒ saturated, more pages may exist
  // (the rare exact-fit case terminates the loop on the next iteration with hasLogsToProcess=false).
  return {
    hasLogsToProcess: true,
    logsPaginationCursor,
    minTimestamp,
    isLastLogsPage: missingLogsToProcess < maxLogsPerPage,
  };
}
