/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useSearchAttacks, useInvalidateSearchAttacks } from './use_search_attacks';
import { searchAttacks } from '../api';
import { getSearchAttacksResponseMock } from '../__mocks__/attacks';
import { useDeepEqualSelector } from '../../../hooks/use_selector';

jest.mock('../../../hooks/use_app_toasts');
jest.mock('../../../hooks/use_selector');
jest.mock('../api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSearchAttacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({
      addSuccess: jest.fn(),
      addError: jest.fn(),
    });
  });

  it('should call searchAttacks with correct params', async () => {
    const query = { query: { match_all: {} } };
    const mockResponse = getSearchAttacksResponseMock();
    (searchAttacks as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useSearchAttacks(query), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(searchAttacks).toHaveBeenCalledWith({
      query,
      signal: expect.any(AbortSignal),
    });
    expect(result.current.data).toEqual(mockResponse);
  });

  it('should handle errors', async () => {
    const query = { query: { match_all: {} } };
    const error = new Error('Test error');
    (searchAttacks as jest.Mock).mockRejectedValueOnce(error);

    const { addError } = useAppToasts();
    const { result } = renderHook(() => useSearchAttacks(query), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(addError).toHaveBeenCalledWith(error, {
      title: expect.any(String),
    });
  });
});

describe('useInvalidateSearchAttacks', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue([{ refetch: mockRefetch }]);
  });

  it('should invalidate queries and refetch global queries', () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInvalidateSearchAttacks(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    result.current();

    expect(invalidateQueriesSpy).toHaveBeenCalledWith(['GET', expect.any(String)], {
      refetchType: 'active',
    });
    expect(mockRefetch).toHaveBeenCalled();
  });
});
