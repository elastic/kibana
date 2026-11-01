/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partitionFilters, partitionRange } from './partitions';

const ranges = (count: number) =>
  Array.from({ length: count }, (_, index) => partitionRange({ index, count }));

describe('session id partitions', () => {
  it('covers every id once: open-ended at both ends, contiguous in between', () => {
    expect(ranges(1)).toEqual([{}]);
    expect(ranges(2)).toEqual([{ lt: '80' }, { gte: '80' }]);
    expect(ranges(3)).toEqual([{ lt: '55' }, { gte: '55', lt: 'ab' }, { gte: 'ab' }]);
  });

  it.each([2, 3, 5, 16, 32])('chains %s partitions without gaps or overlap', (count) => {
    const all = ranges(count);
    for (let i = 1; i < count; i++) {
      expect(all[i].gte).toBe(all[i - 1].lt);
    }
  });

  it('assigns a random UUID to exactly one partition', () => {
    const id = '987b9d68-9b9a-46d3-8b47-d13a1cb70aa4';
    const matching = ranges(4).filter(
      ({ gte, lt }) => (gte == null || id >= gte) && (lt == null || id < lt)
    );
    expect(matching).toEqual([{ gte: '80', lt: 'c0' }]);
  });

  it('adds no filter for a single partition', () => {
    expect(partitionFilters({ index: 0, count: 1 })).toEqual([]);
  });
});
