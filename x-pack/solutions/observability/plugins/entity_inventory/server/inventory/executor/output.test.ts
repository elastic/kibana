/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputColumn, QueryPlan } from '../generator';
import {
  applyLimit,
  fillColumns,
  MAX_PLAN_ROWS,
  orderRows,
  planRowLimit,
  summarizeResults,
} from './output';
import type { InventoryRow, PlanResult } from './types';

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

describe('planRowLimit', () => {
  it('asks for one row more than requested', () => {
    expect(planRowLimit(1)).toBe(2);
    expect(planRowLimit(MAX_PLAN_ROWS - 1)).toBe(MAX_PLAN_ROWS);
  });

  it('throws outside 1 to MAX_PLAN_ROWS - 1 or for a non-integer', () => {
    expect(() => planRowLimit(0)).toThrow(RangeError);
    expect(() => planRowLimit(MAX_PLAN_ROWS)).toThrow(RangeError);
    expect(() => planRowLimit(2.5)).toThrow(RangeError);
    expect(() => planRowLimit(NaN)).toThrow(RangeError);
  });
});

describe('summarizeResults', () => {
  const plan: QueryPlan = {
    index: 0,
    sourceIndex: 0,
    indexPattern: 'p',
    engine: 'FROM',
    attributes: [],
  };
  const result = (rowCount: number, isPartial = false): PlanResult => ({
    plan,
    columns: [],
    rows: Array.from({ length: rowCount }, (_, position) => ({ 'entity.id': `e${position}` })),
    isPartial,
  });

  it('is exact and not truncated when no plan is cut and fewer rows merged than requested', () => {
    expect(summarizeResults([result(3), result(2)], 10, 4)).toEqual({
      total: 4,
      truncated: false,
    });
  });

  it('is exact and truncated when more rows merged than requested', () => {
    expect(summarizeResults([result(5), result(5)], 5, 8)).toEqual({
      total: 8,
      truncated: true,
    });
  });

  it('has no total and is truncated when a plan returned its full limit', () => {
    expect(summarizeResults([result(6), result(1)], 5, 6)).toEqual({
      total: null,
      truncated: true,
    });
  });

  it('has no total and is not truncated when a plan was partial', () => {
    expect(summarizeResults([result(1), result(1, true)], 5, 2)).toEqual({
      total: null,
      truncated: false,
    });
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

  it('gives null for an absent column named like an Object.prototype member', () => {
    const [filled] = fillColumns(
      [{ 'entity.id': 'a' }],
      [
        { name: 'entity.id', kind: 'id' },
        { name: 'toString', kind: 'attribute', fieldByPlan: {} },
        { name: 'constructor', kind: 'identity' },
      ]
    );
    expect(Object.values(filled)).toEqual(['a', null, null]);
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
