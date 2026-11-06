/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FILTER_VALUE_CAP,
  formatFilterValues,
  parseFilterValues,
  partitionFilterValues,
  singleIncludedValue,
  toggleFilterValue,
} from './filter_values';

describe('parseFilterValues', () => {
  it('has no values for an unset or empty param', () => {
    expect(parseFilterValues(undefined)).toEqual([]);
    expect(parseFilterValues('')).toEqual([]);
    expect(parseFilterValues(',,')).toEqual([]);
  });

  it('reads a plain value as included, like the Sessions list params', () => {
    expect(parseFilterValues('Mobile Safari')).toEqual([
      { value: 'Mobile Safari', exclude: false },
    ]);
  });

  it('reads a comma-separated list, with `!` before the excluded values', () => {
    expect(parseFilterValues('Firefox,!Chrome,Safari')).toEqual([
      { value: 'Firefox', exclude: false },
      { value: 'Chrome', exclude: true },
      { value: 'Safari', exclude: false },
    ]);
  });

  it('reads an escaped comma, `!` and backslash as part of the value', () => {
    expect(parseFilterValues('https://shop.example.com/a\\,b,\\!bang,back\\\\slash')).toEqual([
      { value: 'https://shop.example.com/a,b', exclude: false },
      { value: '!bang', exclude: false },
      { value: 'back\\slash', exclude: false },
    ]);
  });

  it('reads a `!` inside a value as part of it', () => {
    expect(parseFilterValues('Wow!')).toEqual([{ value: 'Wow!', exclude: false }]);
  });

  it('drops duplicates, keeping the first', () => {
    expect(parseFilterValues('Chrome,!Chrome,Chrome')).toEqual([
      { value: 'Chrome', exclude: false },
    ]);
  });

  it('keeps at most the cap', () => {
    const raw = Array.from({ length: FILTER_VALUE_CAP + 5 }, (_, index) => `v${index}`).join(',');

    expect(parseFilterValues(raw)).toHaveLength(FILTER_VALUE_CAP);
  });

  it('keeps a trailing backslash as it is', () => {
    expect(parseFilterValues('path\\')).toEqual([{ value: 'path\\', exclude: false }]);
  });
});

describe('formatFilterValues', () => {
  it('has an empty param for no values', () => {
    expect(formatFilterValues([])).toBe('');
  });

  it('writes the excluded values with `!`', () => {
    expect(
      formatFilterValues([
        { value: 'Firefox', exclude: false },
        { value: 'Chrome', exclude: true },
      ])
    ).toBe('Firefox,!Chrome');
  });

  it('round-trips values with a comma, a leading `!` and a backslash', () => {
    const values = [
      { value: 'https://shop.example.com/a,b', exclude: false },
      { value: '!bang', exclude: true },
      { value: '!also', exclude: false },
      { value: 'back\\slash', exclude: true },
    ];

    expect(parseFilterValues(formatFilterValues(values))).toEqual(values);
  });
});

describe('toggleFilterValue', () => {
  const chrome = { value: 'Chrome', exclude: false };

  it('adds a value as included or excluded', () => {
    expect(toggleFilterValue([], 'Chrome', false)).toEqual([chrome]);
    expect(toggleFilterValue([], 'Chrome', true)).toEqual([{ value: 'Chrome', exclude: true }]);
  });

  it('removes a value picked again with the same polarity', () => {
    expect(toggleFilterValue([chrome], 'Chrome', false)).toEqual([]);
  });

  it('switches a value picked with the other polarity', () => {
    expect(toggleFilterValue([chrome], 'Chrome', true)).toEqual([
      { value: 'Chrome', exclude: true },
    ]);
  });

  it('does not add a value past the cap, but still switches one in the list', () => {
    const full = Array.from({ length: FILTER_VALUE_CAP }, (_, index) => ({
      value: `v${index}`,
      exclude: false,
    }));

    expect(toggleFilterValue(full, 'extra', false)).toEqual(full);
    expect(toggleFilterValue(full, 'v0', true)).toContainEqual({ value: 'v0', exclude: true });
  });
});

describe('singleIncludedValue', () => {
  it('returns the value of a param with exactly one included value', () => {
    expect(singleIncludedValue('Firefox')).toBe('Firefox');
    expect(singleIncludedValue('a\\,b')).toBe('a,b');
  });

  it('returns nothing for no value, several values or an exclusion', () => {
    expect(singleIncludedValue(undefined)).toBeUndefined();
    expect(singleIncludedValue('Firefox,Chrome')).toBeUndefined();
    expect(singleIncludedValue('!Chrome')).toBeUndefined();
  });
});

describe('partitionFilterValues', () => {
  it('splits the included values from the excluded ones', () => {
    expect(
      partitionFilterValues([
        { value: 'Firefox', exclude: false },
        { value: 'Chrome', exclude: true },
      ])
    ).toEqual({ include: ['Firefox'], exclude: ['Chrome'] });
  });
});
