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

/** Column produced by {@link buildLogPaginationCursorProbeEsql} via terminal `STATS COUNT(*)` over the `LIMIT maxLogsPerPage` stream — bounded; ` = maxLogsPerPage` ⇔ assume next page exists. */
export const LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD = 'total_logs';

/**
 * Returns at most one row: the inclusive slice end (N-th doc in sort order, or last doc if fewer than N remain),
 * plus how many logs are present in this window
 */
export function buildLogPaginationCursorProbeEsql(
  params: LogPageProbeSourceClauseParams & { maxLogsPerPage: number }
): string {
  const { maxLogsPerPage, ...sourceParams } = params;
  return (
    buildLogPageProbeSourceClause(sourceParams) +
    `
  | SORT ${TIMESTAMP_FIELD} ASC, \`${DOCUMENT_ID_FIELD}\` ASC
  | LIMIT ${maxLogsPerPage}
  | STATS ${TIMESTAMP_FIELD} = LAST(${TIMESTAMP_FIELD}, ${TIMESTAMP_FIELD}), \`${DOCUMENT_ID_FIELD}\` = LAST(\`${DOCUMENT_ID_FIELD}\`, ${TIMESTAMP_FIELD}), ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} = COUNT(*)
  | KEEP ${TIMESTAMP_FIELD}, \`${DOCUMENT_ID_FIELD}\`, ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD}`
  );
}

export interface LogPaginationCursorParsedRow {
  logsPaginationCursor: PaginationParams;
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
  // total_logs is bounded by LIMIT maxLogsPerPage; total_logs < maxLogsPerPage means this
  // slice exhausts the window, the value maxLogsPerPage is the saturation marker for "more pages exist".
  return {
    hasLogsToProcess: true,
    logsPaginationCursor,
    isLastLogsPage: missingLogsToProcess < maxLogsPerPage,
  };
}
