/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_COLUMN } from '../generator';
import type { OutputColumn } from '../generator';
import { lastSeenInstant } from './utils';
import type { InventoryRow, PlanResult } from './types';

const compareIds = (a: InventoryRow, b: InventoryRow): number => {
  const idA = String(a[ENTITY_ID_COLUMN]);
  const idB = String(b[ENTITY_ID_COLUMN]);
  return idA < idB ? -1 : idA > idB ? 1 : 0;
};

/** Orders rows by `last_seen` descending, nulls last, ties by `entity.id` ascending. */
export const orderRows = (rows: InventoryRow[]): InventoryRow[] =>
  [...rows].sort((a, b) => {
    const seenA = lastSeenInstant(a);
    const seenB = lastSeenInstant(b);
    if (seenA !== seenB) {
      if (seenA === null) {
        return 1;
      }
      if (seenB === null) {
        return -1;
      }
      return seenB - seenA;
    }
    return compareIds(a, b);
  });

/** Takes the first `limit` rows. */
export const applyLimit = (rows: InventoryRow[], limit: number): InventoryRow[] =>
  rows.slice(0, Math.max(0, limit));

// Every plan asks for one row more than the request, so a request may ask for at most `MAX_PLAN_ROWS - 1`.
export const MAX_PLAN_ROWS = 10_000;

/** The `LIMIT` of every plan's list query: one row more than requested, so a cut plan shows. */
export const planRowLimit = (requested: number): number => {
  if (!Number.isInteger(requested) || requested < 1 || requested > MAX_PLAN_ROWS - 1) {
    throw new RangeError(
      `requested rows must be an integer between 1 and ${MAX_PLAN_ROWS - 1}, got ${requested}`
    );
  }
  return requested + 1;
};

/**
 * The total and whether the row limit left rows out. There is no count query: each plan asks for
 * one row more than requested, so a plan that returns its full limit is known to be cut. `truncated`
 * is true only for a cut plan or a merge over `requested` rows; a partial plan is not truncation,
 * since a narrower window would not fix it. When no plan is cut and none is partial the merge holds
 * every entity in the window and the total is exact; otherwise the total is null. `MAX_PLAN_ROWS`
 * is 10,000 because Elasticsearch silently shortens a `LIMIT` above
 * `esql.query.result_truncation_max_size` (default 10,000), so a higher limit could be cut without
 * any signal (elastic/elasticsearch#161965).
 */
export const summarizeResults = (
  results: PlanResult[],
  requested: number,
  mergedRowCount: number
): { total: number | null; truncated: boolean } => {
  const limit = planRowLimit(requested);
  const cut = results.some(({ rows }) => rows.length >= limit);
  const partial = results.some(({ isPartial }) => isPartial);
  return {
    total: cut || partial ? null : mergedRowCount,
    truncated: cut || mergedRowCount > requested,
  };
};

/** Gives every row every output column, in column order, null where nothing produced it. */
export const fillColumns = (rows: InventoryRow[], columns: OutputColumn[]): InventoryRow[] =>
  rows.map((row) =>
    Object.fromEntries(
      columns.map(({ name }) => [name, Object.hasOwn(row, name) ? row[name] ?? null : null])
    )
  );
