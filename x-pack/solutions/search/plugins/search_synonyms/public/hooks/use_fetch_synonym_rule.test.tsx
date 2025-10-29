/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
const mockHttpGet = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockImplementation(async ({ queryFn, opts }) => {
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

describe('useFetchSynonymRule Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return synonym rule', async () => {
    const synonymRule = {
      id: '1',
      synonyms: 'synoym1, synonym2',
    };

    mockHttpGet.mockReturnValue(synonymRule);
    const { useFetchSynonymRule } = jest.requireActual('./use_fetch_synonym_rule');

    const { result } = renderHook(() => useFetchSynonymRule('my_synonyms_set', '1'));
    await waitFor(() => expect(result.current).resolves.toStrictEqual(synonymRule));
  });
});
