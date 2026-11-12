/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FILTER_VALUE_CAP,
  partitionFilterValues,
  singleIncludedValue,
  toggleFilterValue,
} from './filter_values';

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
  it('returns the value of a filter with exactly one included value', () => {
    expect(singleIncludedValue([{ value: 'a,b', exclude: false }])).toBe('a,b');
  });

  it('returns nothing for no value, several values or an exclusion', () => {
    expect(singleIncludedValue(undefined)).toBeUndefined();
    expect(singleIncludedValue([])).toBeUndefined();
    expect(
      singleIncludedValue([
        { value: 'Firefox', exclude: false },
        { value: 'Chrome', exclude: false },
      ])
    ).toBeUndefined();
    expect(singleIncludedValue([{ value: 'Chrome', exclude: true }])).toBeUndefined();
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
