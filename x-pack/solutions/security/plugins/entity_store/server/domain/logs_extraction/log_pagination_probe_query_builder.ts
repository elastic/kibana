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

/** Column produced by {@link buildLogPaginationCursorProbeEsql} via `INLINE STATS` before `LIMIT` (total matching raw rows in the window from the probe). */
export const LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD = 'total_logs';

/**
 * Returns at most one row: the inclusive slice end (N-th doc in sort order, or last doc if fewer than N remain),
 * plus how many raw logs are still to be processed
 */
export function buildLogPaginationCursorProbeEsql(
  params: LogPageProbeSourceClauseParams & { maxLogsPerPage: number }
): string {
  const { maxLogsPerPage, ...sourceParams } = params;
  return (
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
  );
}

export interface LogPaginationCursorParsedRow {
  logsPaginationCursor: PaginationParams;
  /** Total raw log rows matching the probe `WHERE` before `LIMIT` (remaining in the window from the cursor). */
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
  // total_logs is count(*) before LIMIT — total rows still in the window. If that fits in one slice (<= max),
  // this slice exhausts the window (including the exact full-page case).
  return {
    hasLogsToProcess: true,
    logsPaginationCursor,
    isLastLogsPage: missingLogsToProcess <= maxLogsPerPage,
  };
}
