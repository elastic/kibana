/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { createReactQueryWrapper } from '../../../../../../common/mock/create_react_query_wrapper';
import { useDeleteWatchlist } from './use_delete_watchlist';

const mockDeleteWatchlist = jest.fn();

jest.mock('../../../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({ deleteWatchlist: mockDeleteWatchlist }),
}));

jest.mock('../../../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addSuccess: jest.fn(), addError: jest.fn() }),
}));

describe('useDeleteWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteWatchlist.mockResolvedValue({});
  });

  it('deletes with the watchlist_delete execution context', async () => {
    const { result } = renderHook(() => useDeleteWatchlist('default'), {
      wrapper: createReactQueryWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('wl-1');
    });

    expect(mockDeleteWatchlist).toHaveBeenCalledWith(
      { id: 'wl-1' },
      {
        child: {
          type: 'security_solution',
          name: 'entity_analytics:watchlists',
          id: 'watchlist_delete',
        },
      }
    );
  });
});
