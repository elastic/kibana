/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useGetWatchlistFormData } from './use_get_watchlist_form_data';

const mockGetWatchlist = jest.fn();
const mockListWatchlistEntitySources = jest.fn();

jest.mock('../../../../entity_analytics/api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    getWatchlist: mockGetWatchlist,
    listWatchlistEntitySources: mockListWatchlistEntitySources,
  }),
}));

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        uiSettings: {
          get: jest.fn().mockReturnValue(false),
        },
        http: { fetch: jest.fn() },
      },
    }),
  };
});

// Wrap with QueryClientProvider
const { QueryClient, QueryClientProvider } = jest.requireActual('@kbn/react-query');
const React = jest.requireActual('react');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

const watchlistResponse = {
  id: 'wl-1',
  name: 'Privileged Users',
  description: 'High-risk users',
  riskModifier: 10,
  managed: true,
};

const integrationSource = {
  id: 'src-int-1',
  type: 'entity_analytics_integration',
  name: 'okta',
  indexPattern: 'logs-entityanalytics_okta.user-default',
  integrationName: 'entityanalytics_okta',
  enabled: true,
  managed: false,
};

const storeSource = {
  id: 'src-store-1',
  type: 'store',
  name: 'Privileged Users-store',
  queryRule: 'entity.risk.calculated_level: "High"',
  enabled: true,
  managed: false,
};

const indexSource = {
  id: 'src-index-1',
  type: 'index',
  name: 'Privileged Users-logs-*',
  indexPattern: 'logs-*',
  identifierField: 'host.name',
  queryRule: 'agent.type: "filebeat"',
  enabled: true,
  managed: false,
};

describe('useGetWatchlistFormData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null initialWatchlist when watchlistId is not provided', () => {
    const { result } = renderHook(() => useGetWatchlistFormData(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.initialWatchlist).toBeNull();
    expect(result.current.ruleBasedSourceIds).toEqual({});
  });

  it('fetches and transforms watchlist data with rule-based sources', async () => {
    mockGetWatchlist.mockResolvedValue(watchlistResponse);
    mockListWatchlistEntitySources.mockResolvedValue({
      sources: [integrationSource, storeSource, indexSource],
    });

    const { result } = renderHook(() => useGetWatchlistFormData('wl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.initialWatchlist).not.toBeNull();
    });

    // Verify watchlist values
    expect(result.current.initialWatchlist).toEqual(
      expect.objectContaining({
        name: 'Privileged Users',
        description: 'High-risk users',
        riskModifier: 10,
        managed: true,
      })
    );

    // Only rule-based sources should be in entitySources
    expect(result.current.initialWatchlist?.entitySources).toHaveLength(2);
    expect(result.current.initialWatchlist?.entitySources?.map((s) => s.type)).toEqual([
      'store',
      'index',
    ]);

    // ruleBasedSourceIds should map type → id
    expect(result.current.ruleBasedSourceIds).toEqual({
      store: 'src-store-1',
      index: 'src-index-1',
    });
  });

  it('returns empty entitySources when only integration sources exist', async () => {
    mockGetWatchlist.mockResolvedValue(watchlistResponse);
    mockListWatchlistEntitySources.mockResolvedValue({
      sources: [integrationSource],
    });

    const { result } = renderHook(() => useGetWatchlistFormData('wl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.initialWatchlist).not.toBeNull();
    });

    // No rule-based sources → entitySources should be undefined
    expect(result.current.initialWatchlist?.entitySources).toBeUndefined();
    expect(result.current.ruleBasedSourceIds).toEqual({});
  });

  it('builds ruleBasedSourceIds only for sources with id and type', async () => {
    mockGetWatchlist.mockResolvedValue(watchlistResponse);
    mockListWatchlistEntitySources.mockResolvedValue({
      sources: [
        storeSource,
        { type: 'index', name: 'no-id-source', enabled: true }, // Missing ID
      ],
    });

    const { result } = renderHook(() => useGetWatchlistFormData('wl-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.initialWatchlist).not.toBeNull();
    });

    // Only the store source with an ID should be in the map
    expect(result.current.ruleBasedSourceIds).toEqual({
      store: 'src-store-1',
    });
  });
});
