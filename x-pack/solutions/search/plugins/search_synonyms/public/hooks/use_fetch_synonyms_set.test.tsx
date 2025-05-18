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

describe('useFetchSynonymsSet Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return synonyms set', async () => {
    const synonyms = {
      _meta: {
        pageIndex: 0,
        pageSize: 10,
        totalItemCount: 2,
      },
      id: 'my_synonyms_set',
      synonyms: [
        {
          id: '1',
          synonyms: 'foo, bar',
        },
      ],
    };
    mockHttpGet.mockReturnValue(synonyms);
    const { useFetchSynonymsSets } = jest.requireActual('./use_fetch_synonyms_sets');

    const { result } = renderHook(() => useFetchSynonymsSets());
    await waitFor(() => expect(result.current).resolves.toStrictEqual(synonyms));
  });
});
