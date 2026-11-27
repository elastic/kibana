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

/** The longest error message that is kept, in UTF-16 code units. */
export const EVIDENCE_MAX_MESSAGE_LENGTH = 500;

/**
 * Why an evidence query gave no result. Closed so the judge's case and the activity log can tell the
 * three apart without parsing a message.
 * - `query_failed`: the query is not valid ES|QL, Elasticsearch rejected it, a shard failed, the
 *   response was partial (a skipped cluster or project), or it was missing its `columns` or
 *   `values`. A shard failure is an error, never a result with fewer rows.
 * - `timeout`: the query ran longer than its timeout or the client's request timeout.
 * - `aborted`: the caller's signal fired, for example because the run ended.
 */
export const EVIDENCE_ERROR_REASONS = ['query_failed', 'timeout', 'aborted'] as const;

export type EvidenceErrorReason = (typeof EVIDENCE_ERROR_REASONS)[number];

/**
 * One value of a kept row. A value that is not one of these (an array of values, an object) is
 * serialized to a string, so the judge reads text.
 */
export type EvidenceCell = string | number | boolean | null;

/**
 * A kept row, keyed by column name. It holds every column with a value in at least one kept row;
 * ES|QL never returns two columns with the same name.
 */
export type EvidenceRow = Record<string, EvidenceCell>;

/** The query returned rows. */
export interface FoundEvidence {
  result: 'found';
  /** At most {@link EVIDENCE_MAX_ROWS} rows, the first ones the query returned. */
  rows: EvidenceRow[];
  /**
   * The query had more rows than `rows` holds. It is asked for one row more than is kept, so this
   * says only that there were more, not how many: the counts are on the signal.
   */
  rows_truncated: boolean;
  /** A cell was cut at {@link EVIDENCE_MAX_CELL_LENGTH} code units, so a value in `rows` is clipped. */
  cells_truncated: boolean;
}

/**
 * The query ran and returned nothing to read: no rows, or one row whose every cell was null (an
 * aggregate over no matches, which a single matched row with no value cannot be told apart from).
 * Not a refutation: the window may have passed, the data may not have arrived yet, or the query may
 * not match what the rule counted, so the judge reads it as no evidence. More rows with no value
 * are `found`, with empty rows.
 */
export interface EmptyEvidence {
  result: 'empty';
}

/** The query could not be answered. */
export interface ErroredEvidence {
  result: 'error';
  reason: EvidenceErrorReason;
  /**
   * What went wrong, for the activity log and the judge's case; at most
   * {@link EVIDENCE_MAX_MESSAGE_LENGTH} code units.
   */
  message: string;
}

/** What running one evidence query gave. */
export type EvidenceResult = FoundEvidence | EmptyEvidence | ErroredEvidence;
