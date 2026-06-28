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
<<<<<<< HEAD
  it('sorts ASC, limits, then aggregates MAX(timestamp) and COUNT(*)', () => {
=======
  it('adds sort, cap, inline count, and slice-end row after the probe WHERE', () => {
>>>>>>> 9.4
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

<<<<<<< HEAD
  it('returns isLastLogsPage false when sliceDocCount equals maxLogsPerPage (full page, more may follow)', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      sliceDocCount: 100,
=======
  it('returns isLastLogsPage false when more matching logs remain than one page', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z', idCursor: 'a' },
      missingLogsToProcess: 101,
>>>>>>> 9.4
    };
    expect(interpretLogPaginationCursorRows(row, 100)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: false,
<<<<<<< HEAD
      sliceLogCount: 100,
    });
  });

  it('returns isLastLogsPage true when sliceDocCount is less than maxLogsPerPage (partial page = last)', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      sliceDocCount: 99,
=======
    });
  });

  it('returns isLastLogsPage true when exactly maxLogsPerPage logs remain (last full page)', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z', idCursor: 'a' },
      missingLogsToProcess: 100,
>>>>>>> 9.4
    };
    expect(interpretLogPaginationCursorRows(row, 100)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: true,
<<<<<<< HEAD
      sliceLogCount: 99,
=======
>>>>>>> 9.4
    });
  });

  it('returns isLastLogsPage true when fewer than maxLogsPerPage logs remain', () => {
    const row = {
<<<<<<< HEAD
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      sliceDocCount: 3,
=======
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z', idCursor: 'a' },
      missingLogsToProcess: 3,
>>>>>>> 9.4
    };
    expect(interpretLogPaginationCursorRows(row, 100)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: true,
<<<<<<< HEAD
      sliceLogCount: 3,
=======
>>>>>>> 9.4
    });
  });
});

describe('parseLogPaginationCursorRow', () => {
  it('maps columns to slice end and total log count', () => {
    const resp: ESQLSearchResponse = {
      columns: [
        { name: TIMESTAMP_FIELD, type: 'date' },
<<<<<<< HEAD
        { name: LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD, type: 'long' },
      ],
      values: [['2024-01-01T00:00:00.000Z', 42]],
    };
    expect(parseLogPaginationCursorRow(resp)).toEqual({
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      sliceDocCount: 42,
    });
  });

  it('returns undefined when there are no values', () => {
    const resp: ESQLSearchResponse = {
      columns: [
        { name: TIMESTAMP_FIELD, type: 'date' },
        { name: LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD, type: 'long' },
=======
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
>>>>>>> 9.4
      ],
      values: [],
    };
    expect(parseLogPaginationCursorRow(resp)).toBeUndefined();
  });
});
