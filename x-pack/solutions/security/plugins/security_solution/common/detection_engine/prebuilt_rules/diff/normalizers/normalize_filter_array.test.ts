/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore, type Filter } from '@kbn/es-query';
import { normalizeFilterArray } from './normalize_filter_array';

const mockFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'test',
    params: {
      query: 'value',
    },
  },
  query: {
    term: {
      field: 'value',
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
};

describe('normalizeFilterArray', () => {
  it('returns an empty array when filters field is undefined', () => {
    const normalizedFilter = normalizeFilterArray(undefined);

    expect(normalizedFilter).toEqual([]);
  });

  it('returns an empty array when filters field is empty array', () => {
    const normalizedFilter = normalizeFilterArray([]);

    expect(normalizedFilter).toEqual([]);
  });

  it('omits the meta field when not present in the filter object', () => {
    const normalizedFilter = normalizeFilterArray([{ ...mockFilter, meta: undefined }]);

    expect(normalizedFilter).toEqual([
      {
        query: {
          term: {
            field: 'value',
          },
        },
      },
    ]);
  });

  it('normalizes filters[].query when all fields present', () => {
    const normalizedFilter = normalizeFilterArray([mockFilter]);

    expect(normalizedFilter).toMatchObject([
      {
        query: {
          term: {
            field: 'value',
          },
        },
      },
    ]);
  });

  it('normalizes filters[].query when query object is missing', () => {
    const normalizedFilter = normalizeFilterArray([
      { ...mockFilter, query: undefined },
    ]) as Filter[];

    expect(normalizedFilter[0].query).toBeUndefined();
  });

  it.each([
    {
      caseName: 'when all fields present',
      filter: mockFilter,
      expectedFilterMeta: {
        negate: false,
        disabled: false,
        type: 'phrase',
        key: 'test',
        params: {
          query: 'value',
        },
      },
    },
    {
      caseName: 'when disabled field is missing',
      filter: { ...mockFilter, meta: { ...mockFilter.meta, disabled: undefined } },
      expectedFilterMeta: {
        negate: false,
        disabled: false,
        type: 'phrase',
        key: 'test',
        params: {
          query: 'value',
        },
      },
    },
    {
      caseName: 'when negate field is missing',
      filter: { ...mockFilter, meta: { ...mockFilter.meta, negate: undefined } },
      expectedFilterMeta: {
        disabled: false,
        type: 'phrase',
        key: 'test',
        params: {
          query: 'value',
        },
      },
    },
    {
      caseName: 'when query object is missing',
      filter: { ...mockFilter, query: undefined },
      expectedFilterMeta: {
        negate: false,
        disabled: false,
        type: 'phrase',
        key: 'test',
        params: {
          query: 'value',
        },
      },
    },
  ])('normalizes filters[].meta $caseName', ({ filter, expectedFilterMeta }) => {
    const normalizedFilter = normalizeFilterArray([filter]);

    expect(normalizedFilter).toEqual([
      expect.objectContaining({
        meta: expectedFilterMeta,
      }),
    ]);
  });
});
