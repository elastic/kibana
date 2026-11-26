/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The most rows of a query's result that are kept; the judge reads a sample, not the whole result. */
export const EVIDENCE_MAX_ROWS = 5;

/** The longest a cell is kept, in UTF-16 code units, so one log line cannot fill the judge's case. */
export const EVIDENCE_MAX_CELL_LENGTH = 500;

/** How long one evidence query may run, in milliseconds, before it is reported as timed out. */
export const EVIDENCE_TIMEOUT_MS = 20_000;

/**
 * Why an evidence query gave no result. Closed so the judge's case and the activity log can tell the
 * three apart without parsing a message.
 * - `query_failed`: Elasticsearch rejected the query, a shard failed, or the response had no rows
 *   or columns to read. A shard failure is an error, never a result with fewer rows.
 * - `timeout`: the query ran longer than its timeout.
 * - `aborted`: the caller's signal fired, for example because the run ended.
 */
export const EVIDENCE_ERROR_REASONS = ['query_failed', 'timeout', 'aborted'] as const;

export type EvidenceErrorReason = (typeof EVIDENCE_ERROR_REASONS)[number];

/**
 * One value of a kept row. A value that is not one of these (an array of values, an object) is
 * serialized to a string, so the judge reads text.
 */
export type EvidenceCell = string | number | boolean | null;

/** A kept row, keyed by column name; a repeated column name gets a `_<n>` suffix, so no cell is lost. */
export type EvidenceRow = Record<string, EvidenceCell>;

/** The query returned rows. */
export interface FoundEvidence {
  result: 'found';
  /** At most {@link EVIDENCE_MAX_ROWS} rows, the first ones the query returned. */
  rows: EvidenceRow[];
  /**
   * How many rows the query returned. It is not the number of matches when the query has its own
   * `LIMIT`, so a query that stopped at its limit reads as that many rows, not as the true total.
   */
  rows_returned: number;
  /** Rows beyond {@link EVIDENCE_MAX_ROWS} were left out, so more rows came back than `rows` holds. */
  rows_truncated: boolean;
  /** A cell was cut at {@link EVIDENCE_MAX_CELL_LENGTH} code units, so a value in `rows` is clipped. */
  cells_truncated: boolean;
}

/** The query ran and returned no rows: a real negative, unlike an error. */
export interface EmptyEvidence {
  result: 'empty';
}

/** The query could not be answered. */
export interface ErroredEvidence {
  result: 'error';
  reason: EvidenceErrorReason;
  /** What went wrong, for the activity log and the judge's case; at most 500 characters. */
  message: string;
}

/** What running one evidence query gave. */
export type EvidenceResult = FoundEvidence | EmptyEvidence | ErroredEvidence;
