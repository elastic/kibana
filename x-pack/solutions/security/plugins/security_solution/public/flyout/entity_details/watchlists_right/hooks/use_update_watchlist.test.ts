/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useUpdateWatchlist } from './use_update_watchlist';
import type { UseUpdateWatchlistOptions } from './use_update_watchlist';
import type { CreateWatchlistRequestBodyInput } from '../../../../../common/api/entity_analytics/watchlists/management/create.gen';

const mockUpdateWatchlist = jest.fn().mockResolvedValue({ id: 'wl-1', name: 'Updated' });
const mockUpdateWatchlistEntitySource = jest.fn().mockResolvedValue({});
const mockCreateWatchlistEntitySource = jest.fn().mockResolvedValue({});

jest.mock('../../../../entity_analytics/api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    updateWatchlist: mockUpdateWatchlist,
    updateWatchlistEntitySource: mockUpdateWatchlistEntitySource,
    createWatchlistEntitySource: mockCreateWatchlistEntitySource,
  }),
}));

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        notifications: { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } },
      },
    }),
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

const makeWatchlist = (
  entitySources?: CreateWatchlistRequestBodyInput['entitySources']
): CreateWatchlistRequestBodyInput => ({
  name: 'Test Watchlist',
  description: 'desc',
  riskModifier: 10,
  managed: false,
  entitySources,
});

const baseOpts: UseUpdateWatchlistOptions = {
  watchlistId: 'wl-1',
  ruleBasedSourceIds: {},
  watchlist: makeWatchlist(),
  spaceId: 'default',
  onSuccess: jest.fn(),
};

describe('useUpdateWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when watchlistId is missing', async () => {
    const { result } = renderHook(
      () => useUpdateWatchlist({ ...baseOpts, watchlistId: undefined }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('Missing watchlist id');
    });
  });

  it('updates the watchlist itself', async () => {
    const { result } = renderHook(() => useUpdateWatchlist(baseOpts), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockUpdateWatchlist).toHaveBeenCalledWith({
      id: 'wl-1',
      body: baseOpts.watchlist,
    });
  });

  it('creates a new entity source when no existing ID is found', async () => {
    const watchlist = makeWatchlist([
      {
        type: 'store',
        name: 'Test Watchlist-store',
        queryRule: 'risk > 50',
      },
    ]);
    const opts: UseUpdateWatchlistOptions = {
      ...baseOpts,
      ruleBasedSourceIds: {},
      watchlist,
    };

    const { result } = renderHook(() => useUpdateWatchlist(opts), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockCreateWatchlistEntitySource).toHaveBeenCalledWith({
      watchlistId: 'wl-1',
      body: {
        type: 'store',
        name: 'Test Watchlist-store',
        queryRule: 'risk > 50',
        indexPattern: undefined,
        identifierField: undefined,
        enabled: undefined,
      },
    });
    expect(mockUpdateWatchlistEntitySource).not.toHaveBeenCalled();
  });

  it('updates an existing entity source when ID is found in ruleBasedSourceIds', async () => {
    const watchlist = makeWatchlist([
      {
        type: 'store',
        name: 'Test Watchlist-store',
        queryRule: 'risk > 75',
      },
    ]);
    const opts: UseUpdateWatchlistOptions = {
      ...baseOpts,
      ruleBasedSourceIds: { store: 'es-1' },
      watchlist,
    };

    const { result } = renderHook(() => useUpdateWatchlist(opts), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockUpdateWatchlistEntitySource).toHaveBeenCalledWith({
      watchlistId: 'wl-1',
      entitySourceId: 'es-1',
      body: {
        name: 'Test Watchlist-store',
        queryRule: 'risk > 75',
        indexPattern: undefined,
        identifierField: undefined,
        enabled: undefined,
      },
    });
    expect(mockCreateWatchlistEntitySource).not.toHaveBeenCalled();
  });

  it('handles mixed create and update for multiple sources', async () => {
    const watchlist = makeWatchlist([
      { type: 'store', name: 'WL-store', queryRule: 'risk > 50' },
      {
        type: 'index',
        name: 'WL-logs-*',
        indexPattern: 'logs-*',
        identifierField: 'host.name',
      },
    ]);
    const opts: UseUpdateWatchlistOptions = {
      ...baseOpts,
      ruleBasedSourceIds: { store: 'es-store-1' },
      watchlist,
    };

    const { result } = renderHook(() => useUpdateWatchlist(opts), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    // Store should be updated
    expect(mockUpdateWatchlistEntitySource).toHaveBeenCalledWith(
      expect.objectContaining({ entitySourceId: 'es-store-1' })
    );

    // Index should be created
    expect(mockCreateWatchlistEntitySource).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ type: 'index', indexPattern: 'logs-*' }),
      })
    );
  });

  it('does not process sources when entitySources is empty', async () => {
    const watchlist = makeWatchlist(undefined);
    const { result } = renderHook(() => useUpdateWatchlist({ ...baseOpts, watchlist }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockUpdateWatchlist).toHaveBeenCalled();
    expect(mockCreateWatchlistEntitySource).not.toHaveBeenCalled();
    expect(mockUpdateWatchlistEntitySource).not.toHaveBeenCalled();
  });

  describe('callbacks', () => {
    it('shows success toast on success', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useUpdateWatchlist({ ...baseOpts, onSuccess }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(mockAddSuccess).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });

    it('shows error toast on failure', async () => {
      mockUpdateWatchlist.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useUpdateWatchlist(baseOpts), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch {
          // expected
        }
      });

      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ title: expect.any(String) })
      );
    });
  });
});
