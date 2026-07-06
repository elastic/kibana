/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSearchAttacksParams } from './build_search_attacks_params';

describe('buildSearchAttacksParams', () => {
  it('translates ids into a terms filter on _id', () => {
    expect(buildSearchAttacksParams({ ids: ['id-1'] })).toEqual({
      query: {
        bool: {
          filter: { terms: { _id: ['id-1'] } },
        },
      },
    });
  });

  it('merges ids with an existing query', () => {
    const existingQuery = { match_all: {} };

    expect(buildSearchAttacksParams({ ids: ['id-1', 'id-2'], query: existingQuery })).toEqual({
      query: {
        bool: {
          filter: [{ terms: { _id: ['id-1', 'id-2'] } }, existingQuery],
        },
      },
    });
  });

  it('returns search params unchanged when ids is not provided', () => {
    const searchParams = { query: { match_all: {} } };

    expect(buildSearchAttacksParams(searchParams)).toEqual(searchParams);
  });

  it('preserves other search params when translating ids', () => {
    expect(buildSearchAttacksParams({ ids: ['id-1'], size: 10, sort: ['@timestamp'] })).toEqual({
      size: 10,
      sort: ['@timestamp'],
      query: {
        bool: {
          filter: { terms: { _id: ['id-1'] } },
        },
      },
    });
  });
});
