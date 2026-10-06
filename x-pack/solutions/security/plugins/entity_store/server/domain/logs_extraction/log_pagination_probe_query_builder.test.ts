/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { TIMESTAMP_FIELD } from './query_builder_commons';
import {
  LOG_EXTRACTION_SAMPLE_PROBABILITY,
  LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD,
  buildLogPaginationCursorProbeEsql,
  interpretLogPaginationCursorRows,
  parseLogPaginationCursorRow,
  roundSampleProbability,
  scaledProbeLimit,
} from './log_pagination_probe_query_builder';

describe('roundSampleProbability', () => {
  it('bounds a long floating-point value to 4 decimal places', () => {
    expect(roundSampleProbability(2500 / 3000)).toBe(0.8333);
  });

  it('leaves already-clean values unchanged', () => {
    expect(roundSampleProbability(0.1)).toBe(0.1);
    expect(roundSampleProbability(1)).toBe(1);
  });
});

describe('scaledProbeLimit', () => {
  it('scales maxLogsPerPage by the sample probability, rounding to the nearest integer', () => {
    expect(scaledProbeLimit(100, 0.1)).toBe(10);
    expect(scaledProbeLimit(100, 0.25)).toBe(25);
    expect(scaledProbeLimit(100)).toBe(10); // defaults to LOG_EXTRACTION_SAMPLE_PROBABILITY
  });

  it('floors at 1 row so a tiny maxLogsPerPage never yields LIMIT 0', () => {
    expect(scaledProbeLimit(1, 0.1)).toBe(1);
    expect(scaledProbeLimit(4, 0.1)).toBe(1);
  });
});

describe('buildLogPaginationCursorProbeEsql', () => {
  it('samples, sorts ASC, limits to the scaled sample size, then aggregates MAX(timestamp) and COUNT(*)', () => {
    const q = buildLogPaginationCursorProbeEsql({
      indexPatterns: ['logs-*'],
      type: 'user',
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-02T00:00:00.000Z',
      maxLogsPerPage: 100,
    });
    expect(q).toMatchSnapshot();
  });

  it('emits a SAMPLE stage and a LIMIT scaled to a custom sample probability', () => {
    const q = buildLogPaginationCursorProbeEsql({
      indexPatterns: ['logs-*'],
      type: 'user',
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-02T00:00:00.000Z',
      maxLogsPerPage: 100,
      sampleProbability: 0.25,
    });
    expect(q).toContain('| SAMPLE 0.25');
    expect(q).toContain(`| LIMIT ${scaledProbeLimit(100, 0.25)}`);
    expect(q).not.toContain('| LIMIT 100');
  });

  it('defaults sampleProbability to LOG_EXTRACTION_SAMPLE_PROBABILITY when omitted', () => {
    const q = buildLogPaginationCursorProbeEsql({
      indexPatterns: ['logs-*'],
      type: 'user',
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-02T00:00:00.000Z',
      maxLogsPerPage: 100,
    });
    expect(q).toContain(`| SAMPLE ${LOG_EXTRACTION_SAMPLE_PROBABILITY}`);
    expect(q).toContain(`| LIMIT ${scaledProbeLimit(100)}`);
  });

  it('omits the SAMPLE stage entirely at sampleProbability=1 (exact, unsampled probe)', () => {
    const q = buildLogPaginationCursorProbeEsql({
      indexPatterns: ['logs-*'],
      type: 'user',
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-02T00:00:00.000Z',
      maxLogsPerPage: 100,
      sampleProbability: 1,
    });
    expect(q).not.toContain('SAMPLE');
    // scaledProbeLimit(100, 1) === 100: identical to the original pre-sampling LIMIT.
    expect(q).toContain('| LIMIT 100');
  });

  it('rounds a long floating-point sampleProbability before embedding it in the query', () => {
    const q = buildLogPaginationCursorProbeEsql({
      indexPatterns: ['logs-*'],
      type: 'user',
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-02T00:00:00.000Z',
      maxLogsPerPage: 3000,
      sampleProbability: 2500 / 3000, // 0.8333333333333334 unrounded
    });
    expect(q).toContain('| SAMPLE 0.8333');
    expect(q).not.toContain('0.8333333333333334');
  });
});

describe('interpretLogPaginationCursorRows', () => {
  it('treats undefined row as hasLogsToProcess false', () => {
    expect(interpretLogPaginationCursorRows(undefined, 100)).toEqual({
      hasLogsToProcess: false,
      isLastLogsPage: true,
      sliceLogCount: 0,
    });
  });

  it('returns isLastLogsPage false when the sampled count saturates the scaled limit (more pages may follow)', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      sliceDocCount: 10, // === scaledProbeLimit(100, 0.1)
    };
    expect(interpretLogPaginationCursorRows(row, 100, 0.1)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: false,
      sliceLogCount: 100, // estimate: round(10 / 0.1)
    });
  });

  it('returns isLastLogsPage true when the sampled count falls short of the scaled limit (last page)', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      sliceDocCount: 9,
    };
    expect(interpretLogPaginationCursorRows(row, 100, 0.1)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: true,
      sliceLogCount: 90, // estimate: round(9 / 0.1)
    });
  });

  it('returns isLastLogsPage true when very few real logs likely remain', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      sliceDocCount: 1,
    };
    expect(interpretLogPaginationCursorRows(row, 100, 0.1)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: true,
      sliceLogCount: 10, // estimate: round(1 / 0.1)
    });
  });

  it('defaults sampleProbability to LOG_EXTRACTION_SAMPLE_PROBABILITY when omitted', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      sliceDocCount: 10,
    };
    expect(interpretLogPaginationCursorRows(row, 100)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: false,
      sliceLogCount: 100,
    });
  });

  it('respects a custom sample probability for both the saturation check and the estimate', () => {
    const row = {
      logsPaginationCursor: { timestampCursor: '2024-01-01T00:00:00.000Z' },
      sliceDocCount: 25, // === scaledProbeLimit(100, 0.25)
    };
    expect(interpretLogPaginationCursorRows(row, 100, 0.25)).toEqual({
      hasLogsToProcess: true,
      logsPaginationCursor: row.logsPaginationCursor,
      isLastLogsPage: false,
      sliceLogCount: 100, // estimate: round(25 / 0.25)
    });
  });
});

describe('parseLogPaginationCursorRow', () => {
  it('maps columns to slice end and total log count', () => {
    const resp: ESQLSearchResponse = {
      columns: [
        { name: TIMESTAMP_FIELD, type: 'date' },
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
      ],
      values: [],
    };
    expect(parseLogPaginationCursorRow(resp)).toBeUndefined();
  });
});
