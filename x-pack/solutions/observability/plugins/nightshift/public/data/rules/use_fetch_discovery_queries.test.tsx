/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import dateMath from '@kbn/datemath';
import { useFetchDiscoveryQueries } from './use_fetch_discovery_queries';

const NOW = new Date('2026-10-14T12:00:00.000Z');
const mockFetch = jest.fn(async () => ({ page: 1, perPage: 10, total: 0, queries: [] }));
const calculateBounds = ({ from, to }: { from: string; to: string }) => ({
  min: dateMath.parse(from, { forceNow: NOW }),
  max: dateMath.parse(to, { roundUp: true, forceNow: NOW }),
});

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      significantEvents: { significantEventsRepositoryClient: { fetch: mockFetch } },
      data: { query: { timefilter: { timefilter: { calculateBounds } } } },
    },
  }),
}));
jest.mock('../../hooks/use_timefilter', () => ({
  // The global time filter is on its 15-minute default.
  useTimefilter: () => ({
    timeState: { start: NOW.getTime() - 15 * 60 * 1000, end: NOW.getTime() },
  }),
}));
jest.mock('../../hooks/use_fetch_error_toast', () => ({ useFetchErrorToast: () => jest.fn() }));

describe('useFetchDiscoveryQueries', () => {
  it('requests occurrences over a fixed time range instead of the global time filter', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useFetchDiscoveryQueries({
          page: 1,
          perPage: 10,
          timeRange: { from: 'now-24h', to: 'now' },
        }),
      { wrapper }
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch).toHaveBeenCalledWith(
      'GET /internal/streams/_queries',
      expect.objectContaining({
        params: {
          query: expect.objectContaining({
            from: '2026-10-13T12:00:00.000Z',
            to: '2026-10-14T12:00:00.000Z',
          }),
        },
      })
    );
  });
});
