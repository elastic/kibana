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
import {
  useSearchUnifiedAlerts,
  useInvalidateSearchUnifiedAlerts,
} from './use_search_unified_alerts';
import { searchUnifiedAlerts } from '../api';
import { getSearchUnifiedAlertsResponseMock } from '../__mocks__';

jest.mock('../../../hooks/use_app_toasts');
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

describe('useSearchUnifiedAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({
      addSuccess: jest.fn(),
      addError: jest.fn(),
    });
  });

  it('should call searchUnifiedAlerts with correct params', async () => {
    const query = { query: { match_all: {} } };
    const mockResponse = getSearchUnifiedAlertsResponseMock();
    (searchUnifiedAlerts as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useSearchUnifiedAlerts(query), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(searchUnifiedAlerts).toHaveBeenCalledWith({
      query,
      signal: expect.any(AbortSignal),
    });
    expect(result.current.data).toEqual(mockResponse);
  });

  it('should handle errors', async () => {
    const query = { query: { match_all: {} } };
    const error = new Error('Test error');
    (searchUnifiedAlerts as jest.Mock).mockRejectedValueOnce(error);

    const { addError } = useAppToasts();
    const { result } = renderHook(() => useSearchUnifiedAlerts(query), {
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

describe('useInvalidateSearchUnifiedAlerts', () => {
  it('should invalidate queries', () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInvalidateSearchUnifiedAlerts(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    result.current();

    expect(invalidateQueriesSpy).toHaveBeenCalledWith(['GET', expect.any(String)], {
      refetchType: 'active',
    });
  });
});
