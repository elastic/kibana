/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  buildLogPageProbeSourceClause,
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
 */
export function buildLogPaginationCursorProbeEsql(
  params: LogPageProbeSourceClauseParams & { maxLogsPerPage: number }
): string {
  const { maxLogsPerPage, ...sourceParams } = params;
  return (
    `${NULLIFY_UNMAPPED_FIELDS_SETTING}\n` +
    buildLogPageProbeSourceClause(sourceParams) +
    `
  | SORT ${TIMESTAMP_FIELD} ASC
  | LIMIT ${maxLogsPerPage}
  | STATS ${TIMESTAMP_FIELD} = MAX(${TIMESTAMP_FIELD}), ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} = COUNT(*)`
  );
}

export interface LogPaginationCursorParsedRow {
  logsPaginationCursor: LogSlicePaginationParams;
  /** Number of docs in this slice (at most `maxLogsPerPage` due to `LIMIT`). */
  sliceDocCount: number;
}

export function parseLogPaginationCursorRow(
  esqlResponse: ESQLSearchResponse
): LogPaginationCursorParsedRow | undefined {
  if (esqlResponse.values.length === 0 || esqlResponse.documents_found === 0) {
    return undefined;
  }

  const tsIdx = esqlResponse.columns.findIndex(({ name }) => name === TIMESTAMP_FIELD);
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
  };
}

export type LogPaginationCursor =
  | { hasLogsToProcess: false }
  | {
      hasLogsToProcess: true;
      logsPaginationCursor: LogSlicePaginationParams;
      isLastLogsPage: boolean;
      /** Raw log count in this slice: `min(total_logs, maxLogsPerPage)`. Used for volume-cap accounting. */
      sliceLogCount: number;
    };

export function interpretLogPaginationCursorRows(
  row: LogPaginationCursorParsedRow | undefined,
  maxLogsPerPage: number
): LogPaginationCursor {
  if (row === undefined) {
    return { hasLogsToProcess: false };
  }
  const { logsPaginationCursor, sliceDocCount } = row;
  // total_logs is COUNT(*) after LIMIT — at most maxLogsPerPage. If fewer docs were returned
  // than the limit, the window is exhausted. An exact full page means more slices may follow.
  return {
    hasLogsToProcess: true,
    logsPaginationCursor,
    isLastLogsPage: sliceDocCount < maxLogsPerPage,
    sliceLogCount: sliceDocCount,
  };
}
