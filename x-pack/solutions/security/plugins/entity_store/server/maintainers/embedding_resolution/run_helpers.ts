/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkOperationType, BulkResponseItem } from '@elastic/elasticsearch/lib/api/types';

/**
 * The per-row element of `BulkResponse.items`. ES wraps the per-op result
 * (`BulkResponseItem`) in a singleton object keyed by `update` / `index` /
 * `create` / `delete` depending on the action. Re-exported here so the
 * helpers below have a name to refer to without importing the full type
 * literal at every call site.
 */
export type BulkResponseRow = Partial<Record<BulkOperationType, BulkResponseItem>>;

/**
 * Best-effort error formatter for log messages. Mirrors the
 * `(err as Error)?.message ?? err` pattern that was previously inlined at
 * every catch site so that thrown `Error` instances surface their `.message`
 * while plain strings / objects fall back to default coercion.
 */
export const formatError = (err: unknown): string => {
  const msg = (err as { message?: unknown })?.message;
  return String(msg ?? err);
};

/**
 * True iff the per-item bulk operation result carries no `error` field.
 *
 * The maintainer only issues updates today, but accepting the full
 * union of bulk op shapes keeps the helper reusable.
 *
 * Rows with no recognised op object are treated as ok — this matches the
 * pre-extraction behaviour where the inline check did `!op?.error` and
 * relied on `bulkResponse.errors === false` short-circuiting first.
 */
export const bulkItemIsOk = (item: BulkResponseRow): boolean => {
  const op = item.update ?? item.index ?? item.create ?? item.delete;
  return !op?.error;
};
