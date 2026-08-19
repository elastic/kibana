/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatFilterValues,
  joinFilterValues,
  parseFilterValues,
  partitionFilterValues,
  setFilterValue,
  splitFilterValues,
} from './rum_filters';

describe('splitFilterValues', () => {
  it('returns a single value unchanged', () => {
    expect(splitFilterValues('Chrome')).toEqual(['Chrome']);
  });

  it('splits comma-separated values and drops empties', () => {
    expect(splitFilterValues('Chrome, Firefox, ,Safari')).toEqual(['Chrome', 'Firefox', 'Safari']);
  });

  it('dedupes and caps at 20', () => {
    const raw = Array.from({ length: 25 }, (_, index) => `v${index}`)
      .concat('v0')
      .join(',');
    expect(splitFilterValues(raw)).toHaveLength(20);
    expect(splitFilterValues(raw)[0]).toBe('v0');
  });

  it('treats missing as none', () => {
    expect(splitFilterValues(undefined)).toEqual([]);
    expect(splitFilterValues('')).toEqual([]);
  });

  it('strips exclude markers from values', () => {
    expect(splitFilterValues('!US,DE,!FR')).toEqual(['US', 'DE', 'FR']);
  });
});

describe('parseFilterValues', () => {
  it('marks bang-prefixed tokens as exclude', () => {
    expect(parseFilterValues('US,!DE,!FR')).toEqual([
      { value: 'US', exclude: false },
      { value: 'DE', exclude: true },
      { value: 'FR', exclude: true },
    ]);
  });
});

describe('partitionFilterValues', () => {
  it('splits include and exclude lists', () => {
    expect(partitionFilterValues('US,!DE,FR')).toEqual({
      include: ['US', 'FR'],
      exclude: ['DE'],
    });
  });
});

describe('setFilterValue', () => {
  it('toggles include off and switches polarity', () => {
    expect(setFilterValue([{ value: 'US', exclude: false }], 'US', false)).toEqual([]);
    expect(setFilterValue([{ value: 'US', exclude: false }], 'US', true)).toEqual([
      { value: 'US', exclude: true },
    ]);
  });
});

describe('joinFilterValues', () => {
  it('joins unique trimmed values', () => {
    expect(joinFilterValues([' Chrome', 'Firefox', 'Chrome'])).toBe('Chrome,Firefox');
  });

  it('returns empty when nothing selected', () => {
    expect(joinFilterValues([])).toBe('');
  });
});

describe('formatFilterValues', () => {
  it('prefixes excluded values', () => {
    expect(
      formatFilterValues([
        { value: 'US', exclude: false },
        { value: 'DE', exclude: true },
      ])
    ).toBe('US,!DE');
  });
});
