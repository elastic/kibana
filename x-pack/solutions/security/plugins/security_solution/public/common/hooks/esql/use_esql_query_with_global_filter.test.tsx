/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEsqlQueryWithGlobalFilters } from './use_esql_query_with_global_filter';
import { TestProviders, mockGlobalState, createMockStore } from '../../mock';
import React from 'react';

describe('useEsqlQueryWithGlobalFilters', () => {
  it('should return the correct query and filterQuery', () => {
    const initialQuery = 'FROM test* WHERE event.category = test';

    const state = {
      ...mockGlobalState,
      inputs: {
        ...mockGlobalState.inputs,
        global: {
          ...mockGlobalState.inputs.global,
          query: {
            query: 'user.name: test',
            language: 'kuery',
          },
        },
      },
    };

    const { result } = renderHook(() => useEsqlQueryWithGlobalFilters(initialQuery), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders store={createMockStore(state)}> {children} </TestProviders>
      ),
    });

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "filterQuery": Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "user.name": "test",
                      },
                    },
                  ],
                },
              },
              Object {
                "range": Object {
                  "@timestamp": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2020-07-07T08:20:18.966Z",
                    "lt": "2020-07-08T08:20:18.966Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        },
        "query": "FROM test* WHERE event.category = test",
      }
    `);
  });

  it('should update query when globalQuery changes', () => {
    const initialQuery = 'FROM test* WHERE event.category = test';

    const state = {
      ...mockGlobalState,
      inputs: {
        ...mockGlobalState.inputs,
        global: {
          ...mockGlobalState.inputs.global,
          query: {
            query: 'user.name: test',
            language: 'kuery',
          },
        },
      },
    };

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useEsqlQueryWithGlobalFilters(query),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders store={createMockStore(state)}> {children} </TestProviders>
        ),
        initialProps: { query: initialQuery },
      }
    );

    expect(result.current.query).toBe(initialQuery);

    const updatedQuery = 'FROM test* WHERE event.category = updated';
    rerender({ query: updatedQuery });

    expect(result.current.query).toBe(updatedQuery);
  });
});
