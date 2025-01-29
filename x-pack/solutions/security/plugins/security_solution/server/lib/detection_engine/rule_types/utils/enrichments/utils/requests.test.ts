/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeSingleFieldMatchQuery } from './requests';

describe('makeSingleFieldMatchQuery', () => {
  it('return empty query if events are empty', () => {
    expect(
      makeSingleFieldMatchQuery({ values: [], searchByField: 'enrichment.host.name' })
    ).toEqual({
      meta: {
        alias: null,
        negate: false,
        disabled: false,
      },
      query: {
        bool: {
          should: [],
          filter: [],
          minimum_should_match: 1,
        },
      },
    });
  });

  it('return query to search for enrichments', () => {
    expect(
      makeSingleFieldMatchQuery({
        values: ['host name 1', 'host name 2'],
        searchByField: 'enrichment.host.name',
      })
    ).toEqual({
      meta: {
        alias: null,
        negate: false,
        disabled: false,
      },
      query: {
        bool: {
          should: [
            {
              match: {
                'enrichment.host.name': {
                  query: 'host name 1',
                  minimum_should_match: 1,
                },
              },
            },
            {
              match: {
                'enrichment.host.name': {
                  query: 'host name 2',
                  minimum_should_match: 1,
                },
              },
            },
          ],
          filter: [],
          minimum_should_match: 1,
        },
      },
    });
  });

  it('return query with extra filters', () => {
    expect(
      makeSingleFieldMatchQuery({
        values: [],
        searchByField: 'host.name',
        extraFilters: [
          {
            match: {
              id_field: {
                query: 'host.name',
              },
            },
          },
        ],
      })
    ).toEqual({
      meta: {
        alias: null,
        negate: false,
        disabled: false,
      },
      query: {
        bool: {
          should: [],
          filter: [
            {
              match: {
                id_field: {
                  query: 'host.name',
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    });
  });
});
