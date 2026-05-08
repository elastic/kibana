/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  buildLogPageProbeSourceClause,
  DOCUMENT_ID_FIELD,
  TIMESTAMP_FIELD,
  type LogPageProbeSourceClauseParams,
  type PaginationParams,
} from './query_builder_commons';

/** Column produced by {@link buildLogPaginationCursorProbeEsql} via terminal `STATS COUNT(*)` over the `LIMIT maxLogsPerPage + 1` stream — bounded; `> maxLogsPerPage` ⇔ a next page exists. */
export const LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD = 'total_logs';

/**
 * Returns at most one row holding the slice-end cursor and a bounded count.
 *
 * Pipeline: `SORT @timestamp ASC, _id ASC | LIMIT maxLogsPerPage + 1 | STATS LAST(...) , COUNT(*)`.
 * `LIMIT N+1` upstream of a terminal `STATS` keeps the count within `[0, maxLogsPerPage + 1]`,
 * avoiding the full-window scan that an `INLINE STATS count(*)` upstream of `LIMIT` would force
 * (ES|QL forbids `LIMIT` before `INLINE STATS`). The terminal `STATS` collapses to one row, so
 * `esql.query.result_truncation_max_size` does not constrain `maxLogsPerPage`.
 *
 * In the saturated case (`total_logs === maxLogsPerPage + 1`) the cursor lands on the row at
 * ASC position `N+1` rather than `N`; the next slice's exclusive lower-bound `WHERE` consumes
 * one extra row's worth of progress per iteration. Idempotent upserts absorb any minor
 * reprocessing if `LAST` ties on `@timestamp` resolve to a non-maximal `_id`.
 */
export function buildLogPaginationCursorProbeEsql(
  params: LogPageProbeSourceClauseParams & { maxLogsPerPage: number }
): string {
  const { maxLogsPerPage, ...sourceParams } = params;
  return (
    buildLogPageProbeSourceClause(sourceParams) +
    `
  | SORT ${TIMESTAMP_FIELD} ASC, \`${DOCUMENT_ID_FIELD}\` ASC
  | LIMIT ${maxLogsPerPage + 1}
  | STATS ${TIMESTAMP_FIELD} = LAST(${TIMESTAMP_FIELD}, ${TIMESTAMP_FIELD}), \`${DOCUMENT_ID_FIELD}\` = LAST(\`${DOCUMENT_ID_FIELD}\`, ${TIMESTAMP_FIELD}), ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} = COUNT(*)
  | KEEP ${TIMESTAMP_FIELD}, \`${DOCUMENT_ID_FIELD}\`, ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD}`
  );
}

export interface LogPaginationCursorParsedRow {
  logsPaginationCursor: PaginationParams;
  /** Bounded count from terminal `STATS COUNT(*)` over the `LIMIT maxLogsPerPage + 1` stream — values in `[0, maxLogsPerPage + 1]`. */
  missingLogsToProcess: number;
}

export function parseLogPaginationCursorRow(
  esqlResponse: ESQLSearchResponse
): LogPaginationCursorParsedRow | undefined {
  if (esqlResponse.values.length === 0) {
    return undefined;
  }

  const tsIdx = esqlResponse.columns.findIndex(({ name }) => name === TIMESTAMP_FIELD);
  const idIdx = esqlResponse.columns.findIndex(({ name }) => name === DOCUMENT_ID_FIELD);
  const totalIdx = esqlResponse.columns.findIndex(
    ({ name }) => name === LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD
  );
  if (tsIdx === -1 || idIdx === -1 || totalIdx === -1) {
    throw new Error(
      `Expected ${TIMESTAMP_FIELD}, ${DOCUMENT_ID_FIELD}, and ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} columns in log pagination cursor probe response`
    );
  }
  const row = esqlResponse.values[0];
  return {
    logsPaginationCursor: {
      timestampCursor: String(row[tsIdx]),
      idCursor: String(row[idIdx]),
    },
    missingLogsToProcess: Number(row[totalIdx]),
  };
}

export type LogPaginationCursor =
  | { hasLogsToProcess: false }
  | {
      hasLogsToProcess: true;
      logsPaginationCursor: PaginationParams;
      isLastLogsPage: boolean;
    };

export function interpretLogPaginationCursorRows(
  row: LogPaginationCursorParsedRow | undefined,
  maxLogsPerPage: number
): LogPaginationCursor {
  if (row === undefined) {
    return { hasLogsToProcess: false };
  }
  const { logsPaginationCursor, missingLogsToProcess } = row;
  // total_logs is bounded by LIMIT maxLogsPerPage + 1; total_logs <= maxLogsPerPage means this
  // slice exhausts the window, the value maxLogsPerPage + 1 is the saturation marker for "more pages exist".
  return {
    hasLogsToProcess: true,
    logsPaginationCursor,
    isLastLogsPage: missingLogsToProcess <= maxLogsPerPage,
  };
}
