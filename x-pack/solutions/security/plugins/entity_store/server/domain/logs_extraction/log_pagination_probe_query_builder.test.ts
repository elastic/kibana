/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { TIMESTAMP_FIELD } from './query_builder_commons';
import {
  LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD,
  buildLogPaginationCursorProbeEsql,
  interpretLogPaginationCursorRows,
  parseLogPaginationCursorRow,
} from './log_pagination_probe_query_builder';

describe('buildLogPaginationCursorProbeEsql', () => {
  it('adds sort, cap, inline count, and slice-end row after the probe WHERE', () => {
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

  it('returns isLastLogsPage false when more matching logs remain than one page', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z', idCursor: 'a' },
      missingLogsToProcess: 101,
    };
    expect(interpretLogPaginationCursorRows(row, 100)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: false,
    });
  });

  it('returns isLastLogsPage true when exactly maxLogsPerPage logs remain (last full page)', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z', idCursor: 'a' },
      missingLogsToProcess: 100,
    };
    expect(interpretLogPaginationCursorRows(row, 100)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: true,
    });
  });

  it('returns isLastLogsPage true when fewer than maxLogsPerPage logs remain', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z', idCursor: 'a' },
      missingLogsToProcess: 3,
    };
    expect(interpretLogPaginationCursorRows(row, 100)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: true,
    });
  });
});

describe('parseLogPaginationCursorRow', () => {
  it('maps columns to slice end and total log count', () => {
    const resp: ESQLSearchResponse = {
      columns: [
        { name: TIMESTAMP_FIELD, type: 'date' },
        { name: '_id', type: 'keyword' },
        { name: LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD, type: 'long' },
      ],
      values: [['2024-01-01T00:00:00.000Z', 'doc1', 42]],
    };
    expect(parseLogPaginationCursorRow(resp)).toEqual({
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z', idCursor: 'doc1' },
      missingLogsToProcess: 42,
    });
  });

  it('returns undefined when there are no values without requiring total_logs column', () => {
    const resp: ESQLSearchResponse = {
      columns: [
        { name: TIMESTAMP_FIELD, type: 'date' },
        { name: '_id', type: 'keyword' },
      ],
      values: [],
    };
    expect(parseLogPaginationCursorRow(resp)).toBeUndefined();
  });
});
