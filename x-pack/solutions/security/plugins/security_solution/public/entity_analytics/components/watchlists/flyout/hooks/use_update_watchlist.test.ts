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
import type { CreateWatchlistRequestBodyInput } from '../../../../../../common/api/entity_analytics/watchlists/management/create.gen';

const mockUpdateWatchlist = jest.fn().mockResolvedValue({ id: 'wl-1', name: 'Updated' });

jest.mock('../../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    updateWatchlist: mockUpdateWatchlist,
  }),
}));

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../../common/lib/kibana');
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
  watchlist: makeWatchlist(),
  spaceId: 'default',
  onSuccess: jest.fn(),
};

const save = async (opts: UseUpdateWatchlistOptions) => {
  const { result } = renderHook(() => useUpdateWatchlist(opts), { wrapper: createWrapper() });
  await act(async () => {
    await result.current.mutateAsync();
  });
};

describe('useUpdateWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when watchlistId is missing', async () => {
    const { result } = renderHook(
      () => useUpdateWatchlist({ ...baseOpts, watchlistId: undefined }),
      {
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('Missing watchlist id');
    });
    expect(mockUpdateWatchlist).not.toHaveBeenCalled();
  });

  it('saves the watchlist and its data sources in a single request', async () => {
    await save({
      ...baseOpts,
      hasEntitySourceChanges: true,
      watchlist: makeWatchlist([
        { type: 'store', name: 'Test Watchlist-store', queryRule: 'risk > 50' },
      ]),
    });

    expect(mockUpdateWatchlist).toHaveBeenCalledTimes(1);
    expect(mockUpdateWatchlist).toHaveBeenCalledWith(
      {
        id: 'wl-1',
        body: {
          name: 'Test Watchlist',
          description: 'desc',
          riskModifier: 10,
          managed: false,
          entitySources: [
            {
              type: 'store',
              name: 'Test Watchlist-store',
              queryRule: 'risk > 50',
              indexPattern: undefined,
              identifierField: undefined,
              enabled: undefined,
            },
          ],
        },
      },
      expect.objectContaining({ child: expect.objectContaining({ id: 'watchlist_update' }) })
    );
  });

  it('sends the lookback range only for index sources', async () => {
    const range = { start: 'now-10d', end: 'now' };

    await save({
      ...baseOpts,
      hasEntitySourceChanges: true,
      watchlist: makeWatchlist([
        {
          type: 'index',
          name: 'wl-logs-*',
          indexPattern: 'logs-*',
          identifierField: 'host.name',
          range,
        },
      ]),
    });

    const [{ body }] = mockUpdateWatchlist.mock.calls[0];
    expect(body.entitySources[0]).toEqual(expect.objectContaining({ type: 'index', range }));
  });

  it('leaves the data sources alone when the form did not change them', async () => {
    await save(baseOpts);

    const [{ body }] = mockUpdateWatchlist.mock.calls[0];
    expect(body.entitySources).toBeUndefined();
  });

  it('omits the data sources when the user did not change them, even though the form holds them', async () => {
    await save({
      ...baseOpts,
      hasEntitySourceChanges: false,
      watchlist: makeWatchlist([
        { type: 'store', name: 'Test Watchlist-store', queryRule: 'risk > 50' },
      ]),
    });

    const [{ body }] = mockUpdateWatchlist.mock.calls[0];
    expect(body.name).toBe('Test Watchlist');
    expect(body.entitySources).toBeUndefined();
  });

  it('removes the data sources when "None" is selected', async () => {
    await save({ ...baseOpts, hasEntitySourceChanges: true, watchlist: makeWatchlist([]) });

    const [{ body }] = mockUpdateWatchlist.mock.calls[0];
    expect(body.entitySources).toEqual([]);
  });

  it('does not send integration sources, which are managed separately', async () => {
    await save({
      ...baseOpts,
      hasEntitySourceChanges: true,
      watchlist: makeWatchlist([
        {
          type: 'entity_analytics_integration',
          name: 'okta',
          integrationName: 'entityanalytics_okta',
        },
      ]),
    });

    const [{ body }] = mockUpdateWatchlist.mock.calls[0];
    expect(body.entitySources).toEqual([]);
  });

  describe('callbacks', () => {
    it('shows a success toast and closes on success', async () => {
      const onSuccess = jest.fn();

      await save({ ...baseOpts, onSuccess });

      expect(mockAddSuccess).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });

    it('shows the reason from the server in an error toast and stays open', async () => {
      const onSuccess = jest.fn();
      mockUpdateWatchlist.mockRejectedValueOnce(
        Object.assign(new Error('Conflict'), {
          body: { statusCode: 409, message: 'A watchlist named "test-01" already exists' },
        })
      );
      const { result } = renderHook(() => useUpdateWatchlist({ ...baseOpts, onSuccess }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow();
      });

      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          title: 'Failed to update watchlist',
          toastMessage: 'A watchlist named "test-01" already exists',
        })
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
