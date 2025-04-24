/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, PhraseFilter } from '@kbn/es-query';
import { filterExistsInFiltersArray, FilterIn, FilterOut, updateFiltersArray } from './filter';

describe('filterExistsInFiltersArray', () => {
  it('should return false if empty array', () => {
    const existingFilters: PhraseFilter[] = [];
    const key: string = 'key';
    const value: string = 'value';

    const doesFilterExists = filterExistsInFiltersArray(existingFilters, key, value);

    expect(doesFilterExists).toBe(undefined);
  });

  it('should return false if wrong filter', () => {
    const key: string = 'key';
    const value: string = 'value';
    const filter = {
      meta: {
        alias: null,
        negate: true,
        disabled: false,
        type: 'phrase',
        key,
        params: { query: value },
      },
      query: { match_phrase: { [key]: value } },
    };
    const existingFilters: PhraseFilter[] = [filter];
    const wrongKey: string = 'wrongKey';
    const wrongValue: string = 'wrongValue';

    const doesFilterExists = filterExistsInFiltersArray(existingFilters, wrongKey, wrongValue);

    expect(doesFilterExists).toBe(undefined);
  });

  it('should return true', () => {
    const key: string = 'key';
    const value: string = 'value';
    const filter = {
      meta: {
        alias: null,
        negate: true,
        disabled: false,
        type: 'phrase',
        key,
        params: { query: value },
      },
      query: { match_phrase: { [key]: value } },
    };
    const existingFilters: PhraseFilter[] = [filter];

    const doesFilterExists = filterExistsInFiltersArray(existingFilters, key, value);

    expect(doesFilterExists).toBe(filter);
  });
});

describe('updateFiltersArray', () => {
  it('should add new filter', () => {
    const existingFilters: PhraseFilter[] = [];
    const key: string = 'key';
    const value: string = 'value';
    const filterType: boolean = FilterOut;

    const newFilters = updateFiltersArray(
      existingFilters,
      key,
      value,
      filterType
    ) as PhraseFilter[];

    expect(newFilters).toEqual([
      {
        meta: {
          alias: null,
          negate: true,
          disabled: false,
          type: 'phrase',
          key: 'key',
          params: { query: 'value' },
        },
        query: { match_phrase: { key: 'value' } },
      },
    ]);
  });

  it(`should remove negated filter`, () => {
    const key: string = 'key';
    const value: string = 'value';
    const existingFilters: Filter[] = [
      {
        meta: {
          alias: null,
          negate: true,
          disabled: false,
          type: 'phrase',
          key,
          params: { query: value },
        },
        query: { match_phrase: { [key]: value } },
      },
    ];
    const filterType: boolean = FilterIn;

    const newFilters = updateFiltersArray(
      existingFilters,
      key,
      value,
      filterType
    ) as PhraseFilter[];

    expect(newFilters).toHaveLength(0);
  });
});
