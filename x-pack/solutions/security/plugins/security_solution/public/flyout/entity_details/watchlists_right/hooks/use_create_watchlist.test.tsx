/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { createReactQueryWrapper } from '../../../../common/mock/create_react_query_wrapper';
import { useCreateWatchlist } from './use_create_watchlist';

const mockCreateWatchlist = jest.fn();

jest.mock('../../../../entity_analytics/api/api', () => ({
  useEntityAnalyticsRoutes: () => ({ createWatchlist: mockCreateWatchlist }),
}));

jest.mock('../../../../common/lib/kibana', () => ({
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
});
