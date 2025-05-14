/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

const mockHttpGet = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockImplementation(async ({ queryKey, queryFn, opts }) => {
    try {
      const res = await queryFn();
      return Promise.resolve(res);
    } catch (e) {
      // opts.onError(e);
    }
  }),
}));

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      http: {
        get: mockHttpGet,
      },
      notifications: {
        toasts: {
          addError: jest.fn(),
        },
      },
    },
  }),
}));

describe('useFetchQueryRulesSets Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return query rules sets', async () => {
    const queryRulesSets = [
      {
        id: '1',
        query_rules: ['foo', 'bar'],
      },
    ];
    mockHttpGet.mockReturnValue(queryRulesSets);
    const { useFetchQueryRulesSets } = jest.requireActual('./use_fetch_query_rules_sets');

    const { result } = renderHook(() => useFetchQueryRulesSets());
    await waitFor(() => expect(result.current).resolves.toStrictEqual(queryRulesSets));
  });
});
