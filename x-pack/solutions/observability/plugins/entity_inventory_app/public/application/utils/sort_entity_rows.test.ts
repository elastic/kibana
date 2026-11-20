/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryRow } from '../../inventory_api/types';
import { sortEntityRows } from './sort_entity_rows';

const getSortValue = (row: InventoryRow, columnId: string) => row[columnId];
const ids = (rows: InventoryRow[]) => rows.map((row) => row.id);

describe('sortEntityRows', () => {
  const rows: InventoryRow[] = [
    { id: 'a', name: 'beta', count: 10, paused: true, ip: ['10.0.0.9', '10.0.0.1'] },
    { id: 'b', name: null, count: 2, paused: false, ip: null },
    { id: 'c', name: 'alpha', count: null, paused: null, ip: ['10.0.0.2'] },
    { id: 'd', name: 'Gamma', count: 100, paused: false, ip: [] },
  ];

  it('returns a copy in input order when there is no sort, without mutating the input', () => {
    const result = sortEntityRows(rows, [], getSortValue);

    expect(ids(result)).toEqual(['a', 'b', 'c', 'd']);
    expect(result).not.toBe(rows);
  });

  it('sorts strings case-insensitively in both directions with nulls last', () => {
    expect(ids(sortEntityRows(rows, [{ id: 'name', direction: 'asc' }], getSortValue))).toEqual([
      'c',
      'a',
      'd',
      'b',
    ]);
    expect(ids(sortEntityRows(rows, [{ id: 'name', direction: 'desc' }], getSortValue))).toEqual([
      'd',
      'a',
      'c',
      'b',
    ]);
  });

  it('sorts numbers numerically with nulls last', () => {
    expect(ids(sortEntityRows(rows, [{ id: 'count', direction: 'asc' }], getSortValue))).toEqual([
      'b',
      'a',
      'd',
      'c',
    ]);
    expect(ids(sortEntityRows(rows, [{ id: 'count', direction: 'desc' }], getSortValue))).toEqual([
      'd',
      'a',
      'b',
      'c',
    ]);
  });

  it('sorts booleans with false before true and nulls last', () => {
    expect(ids(sortEntityRows(rows, [{ id: 'paused', direction: 'asc' }], getSortValue))).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
    expect(ids(sortEntityRows(rows, [{ id: 'paused', direction: 'desc' }], getSortValue))).toEqual([
      'a',
      'b',
      'd',
      'c',
    ]);
  });

  it('sorts multi-value cells by their first value, treating empty arrays as null', () => {
    expect(ids(sortEntityRows(rows, [{ id: 'ip', direction: 'asc' }], getSortValue))).toEqual([
      'c',
      'a',
      'b',
      'd',
    ]);
  });

  it('breaks ties with the next sorting column and keeps input order for full ties', () => {
    const tied: InventoryRow[] = [
      { id: '1', group: 'x', name: 'b' },
      { id: '2', group: 'y', name: 'a' },
      { id: '3', group: 'x', name: 'a' },
      { id: '4', group: 'x', name: 'a' },
    ];

    expect(
      ids(
        sortEntityRows(
          tied,
          [
            { id: 'group', direction: 'asc' },
            { id: 'name', direction: 'asc' },
          ],
          getSortValue
        )
      )
    ).toEqual(['3', '4', '1', '2']);
  });

  it('sorts by the value the getter derives', () => {
    const derived = sortEntityRows(rows, [{ id: 'derived', direction: 'asc' }], (row) =>
      row.name === null ? 'zzz' : row.id
    );

    expect(ids(derived)).toEqual(['a', 'c', 'd', 'b']);
  });
});
