/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  buildLogPageProbeSourceClause,
<<<<<<< HEAD
  NULLIFY_UNMAPPED_FIELDS_SETTING,
  TIMESTAMP_FIELD,
  type LogPageProbeSourceClauseParams,
  type LogSlicePaginationParams,
} from './query_builder_commons';

/** Column produced by {@link buildLogPaginationCursorProbeEsql} via `STATS COUNT(*)` after `LIMIT` (docs in this slice, at most `maxLogsPerPage`). */
export const LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD = 'total_logs';

/**
 * Returns at most one row: the inclusive slice end (`MAX(@timestamp)` of the capped page)
 * and the count of docs in this slice (`COUNT(*)`).
 * If `total_logs < maxLogsPerPage`, this slice exhausts the window (last page).
 * If `total_logs >= maxLogsPerPage`, more slices remain.
=======
  DOCUMENT_ID_FIELD,
  TIMESTAMP_FIELD,
  type LogPageProbeSourceClauseParams,
  type PaginationParams,
} from './query_builder_commons';

/** Column produced by {@link buildLogPaginationCursorProbeEsql} via `INLINE STATS` before `LIMIT` (total matching raw rows in the window from the probe). */
export const LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD = 'total_logs';

/**
 * Returns at most one row: the inclusive slice end (N-th doc in sort order, or last doc if fewer than N remain),
 * plus how many raw logs are still to be processed
>>>>>>> 9.4
 */
export function buildLogPaginationCursorProbeEsql(
  params: LogPageProbeSourceClauseParams & { maxLogsPerPage: number }
): string {
  const { maxLogsPerPage, ...sourceParams } = params;
  return (
<<<<<<< HEAD
    `${NULLIFY_UNMAPPED_FIELDS_SETTING}\n` +
    buildLogPageProbeSourceClause(sourceParams) +
    `
  | SORT ${TIMESTAMP_FIELD} ASC
  | LIMIT ${maxLogsPerPage}
  | STATS ${TIMESTAMP_FIELD} = MAX(${TIMESTAMP_FIELD}), ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} = COUNT(*)`
=======
    buildLogPageProbeSourceClause(sourceParams) +
    // The INLINE STATS will return more than maxLogsPerPage if there are more logs to be processed on purpose,
    // since we can't have INLINE STATS after LIMIT. Yet, this communicates if there are more than 40k logs to be processed.
    `
  | INLINE STATS ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} = count(*)
  | SORT ${TIMESTAMP_FIELD} ASC, \`${DOCUMENT_ID_FIELD}\` ASC
  | LIMIT ${maxLogsPerPage}
  | SORT ${TIMESTAMP_FIELD} DESC, \`${DOCUMENT_ID_FIELD}\` DESC
  | LIMIT 1
  | KEEP ${TIMESTAMP_FIELD}, \`${DOCUMENT_ID_FIELD}\`, ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD}`
>>>>>>> 9.4
  );
}

export interface LogPaginationCursorParsedRow {
<<<<<<< HEAD
  logsPaginationCursor: LogSlicePaginationParams;
  /** Number of docs in this slice (at most `maxLogsPerPage` due to `LIMIT`). */
  sliceDocCount: number;
=======
  logsPaginationCursor: PaginationParams;
  /** Total raw log rows matching the probe `WHERE` before `LIMIT` (remaining in the window from the cursor). */
  missingLogsToProcess: number;
>>>>>>> 9.4
}

export function parseLogPaginationCursorRow(
  esqlResponse: ESQLSearchResponse
): LogPaginationCursorParsedRow | undefined {
<<<<<<< HEAD
  if (esqlResponse.values.length === 0 || esqlResponse.documents_found === 0) {
=======
  if (esqlResponse.values.length === 0) {
>>>>>>> 9.4
    return undefined;
  }

  const tsIdx = esqlResponse.columns.findIndex(({ name }) => name === TIMESTAMP_FIELD);
<<<<<<< HEAD
  const totalIdx = esqlResponse.columns.findIndex(
    ({ name }) => name === LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD
  );
  const row = esqlResponse.values[0];

  if (tsIdx === -1 || totalIdx === -1) {
    if (totalIdx > -1 && row[totalIdx] === 0) {
      // A page without results can return total values only since MAX(@timestamp) is NULL
      return undefined;
    }

    throw new Error(
      `Expected ${TIMESTAMP_FIELD} and ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} columns in log pagination cursor probe response`
    );
  }

  return {
    logsPaginationCursor: {
      timestampCursor: String(row[tsIdx]),
    },
    sliceDocCount: Number(row[totalIdx]),
=======
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
>>>>>>> 9.4
  };
}

export type LogPaginationCursor =
  | { hasLogsToProcess: false }
  | {
      hasLogsToProcess: true;
<<<<<<< HEAD
      logsPaginationCursor: LogSlicePaginationParams;
      isLastLogsPage: boolean;
      /** Raw log count in this slice: `min(total_logs, maxLogsPerPage)`. Used for volume-cap accounting. */
      sliceLogCount: number;
=======
      logsPaginationCursor: PaginationParams;
      isLastLogsPage: boolean;
>>>>>>> 9.4
    };

export function interpretLogPaginationCursorRows(
  row: LogPaginationCursorParsedRow | undefined,
  maxLogsPerPage: number
): LogPaginationCursor {
  if (row === undefined) {
    return { hasLogsToProcess: false };
  }
<<<<<<< HEAD
  const { logsPaginationCursor, sliceDocCount } = row;
  // total_logs is COUNT(*) after LIMIT — at most maxLogsPerPage. If fewer docs were returned
  // than the limit, the window is exhausted. An exact full page means more slices may follow.
  return {
    hasLogsToProcess: true,
    logsPaginationCursor,
    isLastLogsPage: sliceDocCount < maxLogsPerPage,
    sliceLogCount: sliceDocCount,
=======
  const { logsPaginationCursor, missingLogsToProcess } = row;
  // total_logs is count(*) before LIMIT — total rows still in the window. If that fits in one slice (<= max),
  // this slice exhausts the window (including the exact full-page case).
  return {
    hasLogsToProcess: true,
    logsPaginationCursor,
    isLastLogsPage: missingLogsToProcess <= maxLogsPerPage,
>>>>>>> 9.4
  };
}
