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
    const normalizedFilter = normalizeFilterArray([{ ...mockFilter, query: undefined }]);

    expect(normalizedFilter).not.toMatchObject([
      {
        query: expect.anything(),
      },
    ]);
  });

  it.each([
    {
      caseName: 'when all fields present',
      filter: mockFilter,
      expectedFilterMeta: {
        negate: false,
        disabled: false,
      },
    },
    {
      caseName: 'when disabled field is missing',
      filter: { ...mockFilter, meta: { ...mockFilter.meta, disabled: undefined } },
      expectedFilterMeta: {
        negate: false,
        disabled: false,
      },
    },
    {
      caseName: 'when negate field is missing',
      filter: { ...mockFilter, meta: { ...mockFilter.meta, negate: undefined } },
      expectedFilterMeta: {
        disabled: false,
      },
    },
    {
      caseName: 'when query object is missing',
      filter: { ...mockFilter, query: undefined },
      expectedFilterMeta: {
        negate: false,
        disabled: false,
      },
    },
  ])('normalizes filters[].meta $caseName', ({ filter, expectedFilterMeta }) => {
    const normalizedFilter = normalizeFilterArray([filter]);

    expect(normalizedFilter).toMatchObject([
      {
        meta: expectedFilterMeta,
      },
    ]);
  });

  it('normalizes filters[].meta when query object is missing', () => {
    const normalizedFilter = normalizeFilterArray([{ ...mockFilter, query: undefined }]);

    expect(normalizedFilter).toMatchObject([
      {
        meta: {
          negate: false,
          disabled: false,
        },
      },
    ]);
  });
});
