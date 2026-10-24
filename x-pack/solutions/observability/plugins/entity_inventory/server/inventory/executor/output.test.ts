/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputColumn } from '../generator';
import { applyLimit, fillColumns, isTruncated, orderRows } from './output';
import type { InventoryRow } from './types';

describe('orderRows', () => {
  it('orders by last_seen descending as instants', () => {
    const rows = [
      { 'entity.id': 'a', last_seen: '2026-01-01T00:00:00Z' },
      { 'entity.id': 'b', last_seen: '2026-01-01T10:00:00+02:00' },
      { 'entity.id': 'c', last_seen: '2026-01-02T00:00:00Z' },
    ];
    expect(orderRows(rows).map((row) => row['entity.id'])).toEqual(['c', 'b', 'a']);
  });

  it('puts null and missing last_seen last and breaks ties by entity.id ascending', () => {
    const rows: InventoryRow[] = [
      { 'entity.id': 'z', last_seen: null },
      { 'entity.id': 'b', last_seen: '2026-01-01T00:00:00Z' },
      { 'entity.id': 'y' },
      { 'entity.id': 'a', last_seen: '2026-01-01T00:00:00.000Z' },
    ];
    expect(orderRows(rows).map((row) => row['entity.id'])).toEqual(['a', 'b', 'y', 'z']);
  });

  it('does not reorder its input', () => {
    const rows = [
      { 'entity.id': 'a', last_seen: 1 },
      { 'entity.id': 'b', last_seen: 2 },
    ];
    orderRows(rows);
    expect(rows.map((row) => row['entity.id'])).toEqual(['a', 'b']);
  });
});

describe('applyLimit', () => {
  it('takes rows from the front', () => {
    const rows = [{ 'entity.id': 'a' }, { 'entity.id': 'b' }, { 'entity.id': 'c' }];
    expect(applyLimit(rows, 2)).toEqual([{ 'entity.id': 'a' }, { 'entity.id': 'b' }]);
    expect(applyLimit(rows, 10)).toEqual(rows);
    expect(applyLimit(rows, 0)).toEqual([]);
  });
});

describe('isTruncated', () => {
  it('is true when the count is unknown', () => {
    expect(isTruncated(null, 0)).toBe(true);
    expect(isTruncated(null, 5)).toBe(true);
  });

  it('is true only when the count exceeds the rows returned', () => {
    expect(isTruncated(6, 5)).toBe(true);
    expect(isTruncated(5, 5)).toBe(false);
    expect(isTruncated(4, 5)).toBe(false);
  });
});

describe('fillColumns', () => {
  const columns: OutputColumn[] = [
    { name: 'entity.id', kind: 'id' },
    { name: 'host.name', kind: 'identity' },
    { name: 'os', kind: 'attribute', fieldByPlan: { 0: 'host.os.name' } },
    { name: 'last_seen', kind: 'last_seen' },
  ];

  it('gives every row every column, null where nothing produced it, keys in column order', () => {
    const [filled] = fillColumns([{ last_seen: 1, os: 'linux', 'entity.id': 'a' }], columns);
    expect(filled).toEqual({ 'entity.id': 'a', 'host.name': null, os: 'linux', last_seen: 1 });
    expect(Object.keys(filled)).toEqual(['entity.id', 'host.name', 'os', 'last_seen']);
  });

  it('keeps false, zero and multi-values', () => {
    expect(
      fillColumns(
        [{ 'entity.id': 'a', 'host.name': ['h1', 'h2'], os: false, last_seen: 0 }],
        columns
      )
    ).toEqual([{ 'entity.id': 'a', 'host.name': ['h1', 'h2'], os: false, last_seen: 0 }]);
  });

  it('drops columns that are not output columns', () => {
    expect(fillColumns([{ 'entity.id': 'a', extra: 1 }], columns)).toEqual([
      { 'entity.id': 'a', 'host.name': null, os: null, last_seen: null },
    ]);
  });
});
