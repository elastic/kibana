/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryRow } from '../../inventory_api/types';
import { getFirstScalar } from './get_first_scalar';

export interface EntityRowSortingColumn {
  id: string;
  direction: 'asc' | 'desc';
}

const compareScalars = (a: string | number | boolean, b: string | number | boolean): number => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  return String(a).localeCompare(String(b));
};

/**
 * Sorts rows by the raw values of the given columns. Nulls sort last in both directions, multi-value cells sort by
 * their first value, and rows that tie on every column keep their input order.
 */
export const sortEntityRows = (
  rows: readonly InventoryRow[],
  sortingColumns: readonly EntityRowSortingColumn[]
): InventoryRow[] => {
  if (sortingColumns.length === 0) {
    return rows.slice();
  }

  return rows.slice().sort((rowA, rowB) => {
    for (const { id, direction } of sortingColumns) {
      const a = getFirstScalar(rowA[id]);
      const b = getFirstScalar(rowB[id]);
      if (a === null || b === null) {
        if (a !== b) {
          return a === null ? 1 : -1;
        }
        continue;
      }
      const comparison = compareScalars(a, b);
      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
};
