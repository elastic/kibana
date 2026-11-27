/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { esql, Parser } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import { timeoutSignal } from '@kbn/std';
import { getErrorMessage } from '../errors/get_error_message';
import {
  EVIDENCE_MAX_CELL_LENGTH,
  EVIDENCE_MAX_MESSAGE_LENGTH,
  EVIDENCE_MAX_ROWS,
  EVIDENCE_TIMEOUT_MS,
} from './evidence_types';
import type { EvidenceCell, EvidenceResult, EvidenceRow } from './evidence_types';

/** The largest delay `timeoutSignal` accepts; a larger one throws a `RangeError`. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** Rows asked of Elasticsearch: the kept ones plus one, which only says whether there were more. */
const QUERY_ROW_LIMIT = EVIDENCE_MAX_ROWS + 1;

/** What a run cancelled before or while its query ran gets. */
const ABORTED: EvidenceResult = {
  result: 'error',
  reason: 'aborted',
  message: 'evidence query aborted',
};

/**
 * A cell as the response may carry it. The client types a cell as a scalar, but ES|QL also returns
 * arrays for multi-value fields and objects for some types.
 */
type EsqlCell = EvidenceCell | readonly EsqlCell[] | { readonly [key: string]: EsqlCell };

/** The parts of an ES|QL response this reads, optional because a response is not trusted to have them. */
interface EsqlTable {
  columns?: Array<{ name: string }>;
  values?: EsqlCell[][];
  is_partial?: boolean;
}

export interface RunEvidenceParams {
  /** The client that reads customer data: the space's detection service account. */
  esClient: ElasticsearchClient;
  /** A signal's `evidence_esql`; it runs with one more `LIMIT` than the rows that are kept. */
  query: string;
  /** Stops the query when the run is out of time or cancelled. */
  abortSignal?: AbortSignal;
  /** Overrides {@link EVIDENCE_TIMEOUT_MS}; a value that is not a usable delay is ignored. */
  timeoutMs?: number;
}

/**
 * Cuts the text to `maxLength` UTF-16 code units. A cut that would leave half of a surrogate pair
 * drops that half, so the kept text is always valid when it is encoded.
 */
const cutText = (text: string, maxLength: number): { text: string; cut: boolean } => {
  if (text.length <= maxLength) {
    return { text, cut: false };
  }
  const kept = text.slice(0, maxLength);
  const lastUnit = kept.charCodeAt(kept.length - 1);
  const splitsPair = lastUnit >= 0xd800 && lastUnit <= 0xdbff;
  return { text: splitsPair ? kept.slice(0, -1) : kept, cut: true };
};

const queryFailed = (message: string): EvidenceResult => ({
  result: 'error',
  reason: 'query_failed',
  message: cutText(message, EVIDENCE_MAX_MESSAGE_LENGTH).text,
});

/** The delay to use: `timeoutSignal` throws for anything but an integer in `0..2^31 - 1`. */
const resolveTimeoutMs = (timeoutMs: number | undefined): number =>
  timeoutMs !== undefined &&
  Number.isInteger(timeoutMs) &&
  timeoutMs > 0 &&
  timeoutMs <= MAX_TIMEOUT_MS
    ? timeoutMs
    : EVIDENCE_TIMEOUT_MS;

const shapeCell = (value: EsqlCell | undefined): { cell: EvidenceCell; cut: boolean } => {
  if (value === undefined || value === null) {
    return { cell: null, cut: false };
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return { cell: value, cut: false };
  }
  const { text, cut } = cutText(
    typeof value === 'string' ? value : JSON.stringify(value),
    EVIDENCE_MAX_CELL_LENGTH
  );
  return { cell: text, cut };
};

const toResult = (table: EsqlTable): EvidenceResult => {
  const { columns, values, is_partial: isPartial } = table;
  // A skipped remote cluster or linked project does not fail the query, even with
  // `allow_partial_results: false`: the response is marked partial instead.
  if (isPartial) {
    return queryFailed('the response is partial: a remote cluster or linked project was skipped');
  }
  if (!Array.isArray(columns) || !Array.isArray(values)) {
    return queryFailed('the response has no columns or no values');
  }

  const keptValues = values.slice(0, EVIDENCE_MAX_ROWS);
  // Elasticsearch drops the columns that are null in every returned row, the extra row included,
  // so a column with a value only in that row is dropped here.
  const keptColumns = columns
    .map(({ name }, index) => ({ name, index }))
    .filter(({ index }) => keptValues.some((rowValues) => (rowValues[index] ?? null) !== null));
  if (keptColumns.length === 0) {
    // No rows, or one row whose every cell is null: an aggregate over no matches. More rows than
    // that matched documents whose kept cells hold no value, so they stay a match, not `empty`.
    if (values.length <= 1) {
      return { result: 'empty' };
    }
    return {
      result: 'found',
      rows: keptValues.map((): EvidenceRow => Object.create(null)),
      rows_truncated: values.length > EVIDENCE_MAX_ROWS,
      cells_truncated: false,
    };
  }

  let cellsTruncated = false;
  const rows = keptValues.map((rowValues) => {
    // No prototype, so a column named `__proto__` is a key of the row like any other.
    const row: EvidenceRow = Object.create(null);
    keptColumns.forEach(({ name, index }) => {
      const { cell, cut } = shapeCell(rowValues[index]);
      cellsTruncated = cellsTruncated || cut;
      row[name] = cell;
    });
    return row;
  });

  return {
    result: 'found',
    rows,
    rows_truncated: values.length > EVIDENCE_MAX_ROWS,
    cells_truncated: cellsTruncated,
  };
};

/**
 * Runs a signal's evidence query and returns a bounded result: at most {@link EVIDENCE_MAX_ROWS}
 * rows, with cells cut at {@link EVIDENCE_MAX_CELL_LENGTH}. It never throws: a failure, a timeout
 * and an abort are results. The query asks for one row more than is kept, and a shard failure or
 * a partial response fails it, so a result with fewer rows than the query matched never passes
 * for the whole.
 */
export const runEvidence = async ({
  esClient,
  query,
  abortSignal,
  timeoutMs,
}: RunEvidenceParams): Promise<EvidenceResult> => {
  if (abortSignal?.aborted) {
    return ABORTED;
  }
  // `Parser.parse` never throws; the composer does on a syntax error.
  const { errors: syntaxErrors } = Parser.parse(query);
  if (syntaxErrors.length > 0) {
    return queryFailed(`the evidence query is not valid ES|QL: ${syntaxErrors[0].message}`);
  }
  const effectiveTimeoutMs = resolveTimeoutMs(timeoutMs);

  // The timeout is its own signal, so a timeout and a cancelled run tell apart by which one fired.
  // The query gets one controller that either of them aborts, not `AbortSignal.any`, which keeps
  // its sources' listeners until they are garbage collected and is missing from jsdom.
  const timeout = timeoutSignal(effectiveTimeoutMs);
  const controller = new AbortController();
  const abortQuery = () => controller.abort();

  try {
    abortSignal?.addEventListener('abort', abortQuery, { once: true });
    timeout.addEventListener('abort', abortQuery, { once: true });
    // Elasticsearch drops the columns that are null in every row before it responds: without a
    // `KEEP`, a log source returns every mapped field, and most are null in any given minute. The
    // limit bounds the rows it sends; a column with a value only in the extra row is dropped in
    // `toResult`.
    const response: EsqlTable = await esClient.esql.query(
      {
        query: esql(query).limit(QUERY_ROW_LIMIT).print('basic'),
        allow_partial_results: false,
        drop_null_columns: true,
      },
      { signal: controller.signal }
    );
    return toResult(response);
  } catch (error) {
    // By which signal fired, not by the error: an abort and a response too large are both
    // `RequestAbortedError`. A cancelled run wins over a timeout.
    if (abortSignal?.aborted) {
      return ABORTED;
    }
    if (timeout.aborted) {
      return {
        result: 'error',
        reason: 'timeout',
        message: `evidence query exceeded ${effectiveTimeoutMs} ms`,
      };
    }
    // The client's own request timeout can fire first, when it is set shorter than this one.
    if (error instanceof errors.TimeoutError) {
      return {
        result: 'error',
        reason: 'timeout',
        message: cutText(getErrorMessage(error), EVIDENCE_MAX_MESSAGE_LENGTH).text,
      };
    }
    return queryFailed(getErrorMessage(error));
  } finally {
    // So a query that settles early does not leave the deadline timer, or a listener, behind.
    abortSignal?.removeEventListener('abort', abortQuery);
    timeout.dispose();
  }
};
