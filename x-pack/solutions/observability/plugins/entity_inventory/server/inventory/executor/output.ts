/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_COLUMN } from '../generator';
import type { OutputColumn } from '../generator';
import { lastSeenInstant } from './merge';
import type { InventoryRow } from './types';

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

/** Whether rows were left out: always when the count is unknown, else when it exceeds the rows returned. */
export const isTruncated = (total: number | null, returned: number): boolean =>
  total === null || total > returned;

/** Gives every row every output column, in column order, null where nothing produced it. */
export const fillColumns = (rows: InventoryRow[], columns: OutputColumn[]): InventoryRow[] =>
  rows.map((row) => Object.fromEntries(columns.map(({ name }) => [name, row[name] ?? null])));
