/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
const mockHttpGet = vi.fn();

vi.mock('@kbn/react-query', () => {
  const mocked = {
    useQuery: vi.fn().mockImplementation(async ({ queryFn, opts }) => {
      try {
        const res = await queryFn();
        return Promise.resolve(res);
      } catch (e) {
        // opts.onError(e);
      }
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_kibana', () => {
  const mocked = {
    useKibana: vi.fn().mockReturnValue({
      services: {
        http: {
          get: mockHttpGet,
        },
        notifications: {
          toasts: {
            addError: vi.fn(),
          },
        },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

describe('useFetchSynonymRule Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return synonym rule', async () => {
    const synonymRule = {
      id: '1',
      synonyms: 'synoym1, synonym2',
    };

    mockHttpGet.mockReturnValue(synonymRule);
    const { useFetchSynonymRule } = await vi.importActual('./use_fetch_synonym_rule');

    const { result } = renderHook(() => useFetchSynonymRule('my_synonyms_set', '1'));
    await waitFor(() => expect(result.current).resolves.toStrictEqual(synonymRule));
  });
});
