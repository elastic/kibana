/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { GET_WATCHLISTS_QUERY_KEY } from '../../../../api/hooks/use_get_watchlists';
import { createReactQueryWrapper } from '../../../../../common/mock/create_react_query_wrapper';
import { useCreateWatchlist } from './use_create_watchlist';

const mockCreateWatchlist = jest.fn();

jest.mock('../../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({ createWatchlist: mockCreateWatchlist }),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } } },
  }),
}));

describe('useCreateWatchlist', () => {
  const watchlist = { name: 'Test Watchlist', riskModifier: 1.5 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateWatchlist.mockResolvedValue({ id: 'wl-1', ...watchlist });
  });

  it('creates with the watchlist_create execution context', async () => {
    const { result } = renderHook(() => useCreateWatchlist({ watchlist }), {
      wrapper: createReactQueryWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockCreateWatchlist).toHaveBeenCalledWith(watchlist, {
      child: {
        type: 'security_solution',
        name: 'entity_analytics:watchlists',
        id: 'watchlist_create',
      },
    });
  });

  it('invalidates the watchlists list query on success so the filter refetches', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateWatchlist({ watchlist, spaceId: 'default' }), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: GET_WATCHLISTS_QUERY_KEY });
  });
});
