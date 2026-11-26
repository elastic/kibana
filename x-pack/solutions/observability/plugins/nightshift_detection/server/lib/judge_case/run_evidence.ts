/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { timeoutSignal } from '@kbn/std';
import { getErrorMessage } from '../errors/get_error_message';
import { EVIDENCE_MAX_CELL_LENGTH, EVIDENCE_MAX_ROWS, EVIDENCE_TIMEOUT_MS } from './evidence_types';
import type { EvidenceCell, EvidenceResult, EvidenceRow } from './evidence_types';

/** The longest error message that is kept. */
const MAX_MESSAGE_LENGTH = 500;
/** The largest delay `timeoutSignal` accepts; a larger one throws a `RangeError`. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * A cell as the response may carry it. The client types a cell as a scalar, but ES|QL also returns
 * arrays for multi-value fields and objects for some types.
 */
type EsqlCell = EvidenceCell | readonly EsqlCell[] | { readonly [key: string]: EsqlCell };

/** The parts of an ES|QL response this reads, optional because a response is not trusted to have them. */
interface EsqlTable {
  columns?: Array<{ name: string }>;
  values?: EsqlCell[][];
}

export interface RunEvidenceParams {
  /** The client that reads customer data: the space's detection service account. */
  esClient: ElasticsearchClient;
  /** A signal's `evidence_esql`, run as given. */
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

/** The delay to use: `timeoutSignal` throws for anything but an integer in `0..2^31 - 1`. */
const resolveTimeoutMs = (timeoutMs: number | undefined): number =>
  timeoutMs !== undefined &&
  Number.isInteger(timeoutMs) &&
  timeoutMs > 0 &&
  timeoutMs <= MAX_TIMEOUT_MS
    ? timeoutMs
    : EVIDENCE_TIMEOUT_MS;

/**
 * One key per column. A repeated name takes the first `<name>_<n>` (n >= 2) that is not a key yet
 * and is not the name of a later column, so no cell overwrites another.
 */
const getRowKeys = (names: string[]): string[] => {
  const taken = new Set<string>();
  return names.map((name, index) => {
    const later = names.slice(index + 1);
    let key = name;
    let suffix = 2;
    while (taken.has(key) || (key !== name && later.includes(key))) {
      key = `${name}_${suffix}`;
      suffix += 1;
    }
    taken.add(key);
    return key;
  });
};

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
  const { columns, values } = table;
  if (!Array.isArray(columns) || !Array.isArray(values)) {
    return {
      result: 'error',
      reason: 'query_failed',
      message: 'the response has no columns or no values',
    };
  }
  if (values.length === 0) {
    return { result: 'empty' };
  }

  const keys = getRowKeys(columns.map(({ name }) => name));
  let cellsTruncated = false;
  const rows = values.slice(0, EVIDENCE_MAX_ROWS).map((rowValues) => {
    // No prototype, so a column named `__proto__` is a key of the row like any other.
    const row: EvidenceRow = Object.create(null);
    keys.forEach((key, index) => {
      const { cell, cut } = shapeCell(rowValues[index]);
      cellsTruncated = cellsTruncated || cut;
      row[key] = cell;
    });
    return row;
  });

  return {
    result: 'found',
    rows,
    rows_returned: values.length,
    rows_truncated: values.length > EVIDENCE_MAX_ROWS,
    cells_truncated: cellsTruncated,
  };
};

/**
 * Runs a signal's evidence query and returns a bounded result: at most {@link EVIDENCE_MAX_ROWS}
 * rows, with cells cut at {@link EVIDENCE_MAX_CELL_LENGTH}. It never throws: a failure, a timeout
 * and an abort are results. The query is run as given and a shard failure fails it, so a result
 * with fewer rows than the query matched never passes for the whole.
 */
export const runEvidence = async ({
  esClient,
  query,
  abortSignal,
  timeoutMs,
}: RunEvidenceParams): Promise<EvidenceResult> => {
  const effectiveTimeoutMs = resolveTimeoutMs(timeoutMs);
  const aborted: EvidenceResult = {
    result: 'error',
    reason: 'aborted',
    message: 'evidence query aborted',
  };
  if (abortSignal?.aborted) {
    return aborted;
  }

  // The timeout is its own signal, so a timeout and a cancelled run tell apart by which one fired.
  // The query gets one controller that either of them aborts, not `AbortSignal.any`, which keeps
  // its sources' listeners until they are garbage collected and is missing from jsdom.
  const timeout = timeoutSignal(effectiveTimeoutMs);
  const controller = new AbortController();
  const abortQuery = () => controller.abort();

  try {
    abortSignal?.addEventListener('abort', abortQuery, { once: true });
    timeout.addEventListener('abort', abortQuery, { once: true });
    const response: EsqlTable = await esClient.esql.query(
      { query, allow_partial_results: false },
      { signal: controller.signal }
    );
    return toResult(response);
  } catch (error) {
    // By which signal fired, not by the error: an abort and a response too large are both
    // `RequestAbortedError`. A cancelled run wins over a timeout.
    if (abortSignal?.aborted) {
      return aborted;
    }
    if (timeout.aborted) {
      return {
        result: 'error',
        reason: 'timeout',
        message: `evidence query exceeded ${effectiveTimeoutMs} ms`,
      };
    }
    return {
      result: 'error',
      reason: 'query_failed',
      message: cutText(getErrorMessage(error), MAX_MESSAGE_LENGTH).text,
    };
  } finally {
    // So a query that settles early does not leave the deadline timer, or a listener, behind.
    abortSignal?.removeEventListener('abort', abortQuery);
    timeout.dispose();
  }
};
