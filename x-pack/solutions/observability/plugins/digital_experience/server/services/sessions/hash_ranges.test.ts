/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HASH_SPACE, hashPrefix, hashRanges, splitHashRange } from './hash_ranges';

describe('hashRanges', () => {
  it('covers every hash with adjacent ranges of about the same size', () => {
    const ranges = hashRanges(3);

    expect(ranges[0].from).toBe(0);
    expect(ranges[ranges.length - 1].to).toBe(HASH_SPACE);
    ranges.slice(1).forEach((range, index) => expect(range.from).toBe(ranges[index].to));
    ranges.forEach(({ from, to }) => expect(to - from).toBeGreaterThanOrEqual(HASH_SPACE / 3 - 1));
  });

  it('makes at least one range', () => {
    expect(hashRanges(0)).toEqual([{ from: 0, to: HASH_SPACE }]);
    expect(hashRanges(0.4)).toEqual([{ from: 0, to: HASH_SPACE }]);
  });
});

describe('splitHashRange', () => {
  it('splits a range into two halves that meet', () => {
    expect(splitHashRange({ from: 0, to: HASH_SPACE })).toEqual([
      { from: 0, to: HASH_SPACE / 2 },
      { from: HASH_SPACE / 2, to: HASH_SPACE },
    ]);
  });

  it('does not split a single hash prefix', () => {
    expect(splitHashRange({ from: 5, to: 6 })).toBeUndefined();
  });
});

describe('hashPrefix', () => {
  it('writes a bound as eight hex digits, which a longer hash compares against by prefix', () => {
    expect(hashPrefix(0)).toBe('00000000');
    expect(hashPrefix(HASH_SPACE / 2)).toBe('80000000');
    const hash = 'ffffffff0123';
    expect(hash >= hashPrefix(HASH_SPACE - 1)).toBe(true);
  });
});
