/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { TIMESTAMP_FIELD } from './query_builder_commons';
import {
  LOG_PAGINATION_CURSOR_MIN_TIMESTAMP_FIELD,
  LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD,
  buildLogPaginationCursorProbeEsql,
  interpretLogPaginationCursorRows,
  parseLogPaginationCursorRow,
} from './log_pagination_probe_query_builder';

describe('buildLogPaginationCursorProbeEsql', () => {
  it('sorts by @timestamp only, limits to maxLogsPerPage, reads slice-end + min_ts + bounded count via terminal STATS', () => {
    const q = buildLogPaginationCursorProbeEsql({
      indexPatterns: ['logs-*'],
      type: 'user',
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-02T00:00:00.000Z',
      maxLogsPerPage: 100,
    });
    expect(q).toMatchSnapshot();
  });
});

describe('interpretLogPaginationCursorRows', () => {
  it('treats undefined row as hasLogsToProcess false', () => {
    expect(interpretLogPaginationCursorRows(undefined, 100)).toEqual({ hasLogsToProcess: false });
  });

  it('returns isLastLogsPage false at saturation marker (total_logs == maxLogsPerPage)', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      minTimestamp: '2024-01-01T00:00:00.000Z',
      missingLogsToProcess: 100,
    };
    expect(interpretLogPaginationCursorRows(row, 100)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      minTimestamp: row.minTimestamp,
      isLastLogsPage: false,
    });
  });

  it('returns isLastLogsPage true when fewer than maxLogsPerPage logs remain', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      minTimestamp: '2024-01-01T00:00:00.000Z',
      missingLogsToProcess: 3,
    };
    expect(interpretLogPaginationCursorRows(row, 100)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      minTimestamp: row.minTimestamp,
      isLastLogsPage: true,
    });
  });
});

describe('parseLogPaginationCursorRow', () => {
  it('maps columns to slice end, min @timestamp, and total log count', () => {
    const resp: ESQLSearchResponse = {
      columns: [
        { name: TIMESTAMP_FIELD, type: 'date' },
        { name: LOG_PAGINATION_CURSOR_MIN_TIMESTAMP_FIELD, type: 'date' },
        { name: LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD, type: 'long' },
      ],
      values: [['2024-01-01T00:00:05.000Z', '2024-01-01T00:00:00.000Z', 42]],
    };
    expect(parseLogPaginationCursorRow(resp)).toEqual({
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:05.000Z' },
      minTimestamp: '2024-01-01T00:00:00.000Z',
      missingLogsToProcess: 42,
    });
  });

  it('returns undefined when there are no values without requiring all columns', () => {
    const resp: ESQLSearchResponse = {
      columns: [{ name: TIMESTAMP_FIELD, type: 'date' }],
      values: [],
    };
    expect(parseLogPaginationCursorRow(resp)).toBeUndefined();
  });
});
