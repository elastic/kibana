/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { MOCK_QUERY_RULESET_RESPONSE_FIXTURE } from '../../common/__fixtures__/query_rules_ruleset';

const mockHttpGet = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockImplementation(async ({ queryKey, queryFn, opts }) => {
    try {
      const res = await queryFn();
      return Promise.resolve(res);
    } catch (_) {
      // silent fail as we don't handle error yet
    }
  }),
}));

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      http: {
        get: mockHttpGet,
      },
    },
  }),
}));

describe('useFetchQueryRuleset hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return query ruleset', async () => {
    mockHttpGet.mockReturnValue(MOCK_QUERY_RULESET_RESPONSE_FIXTURE);

    const { useFetchQueryRuleset } = jest.requireActual('./use_fetch_query_ruleset');

    const { result } = renderHook(() => useFetchQueryRuleset('my-ruleset'));
    await waitFor(() => {
      expect(result.current).resolves.toStrictEqual(MOCK_QUERY_RULESET_RESPONSE_FIXTURE);
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/search_query_rules/ruleset/my-ruleset');
    });
  });
});
