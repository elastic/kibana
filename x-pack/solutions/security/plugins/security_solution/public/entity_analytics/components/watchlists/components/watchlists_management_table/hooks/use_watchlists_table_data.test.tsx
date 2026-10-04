/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useWatchlistsTableData } from './use_watchlists_table_data';

const mockFetchWatchlists = jest.fn();
const mockListWatchlistEntitySources = jest.fn();

jest.mock('../../../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    fetchWatchlists: mockFetchWatchlists,
    listWatchlistEntitySources: mockListWatchlistEntitySources,
  }),
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useWatchlistsTableData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchWatchlists.mockResolvedValue([
      {
        id: 'manual-only',
        name: 'Manual only',
        managed: false,
        riskModifier: 1,
        hasManualEntities: true,
      },
      {
        id: 'manual-and-source',
        name: 'Manual and source',
        managed: false,
        riskModifier: 1,
        entitySourceIds: ['source-1'],
        hasManualEntities: true,
      },
      {
        id: 'empty',
        name: 'Empty',
        managed: false,
        riskModifier: 1,
        hasManualEntities: false,
      },
    ]);
    mockListWatchlistEntitySources.mockResolvedValue({
      sources: [{ id: 'source-1', type: 'store' }],
    });
  });

  it('includes manual assignments in the source label without requesting sources for empty lists', async () => {
    const { result } = renderHook(() => useWatchlistsTableData('default', 0, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.visibleRecords).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'manual-only', source: 'Manual' }),
          expect.objectContaining({ id: 'manual-and-source', source: 'Manual, Entity Store' }),
          expect.objectContaining({ id: 'empty' }),
        ])
      );
    });

    expect(result.current.visibleRecords.find(({ id }) => id === 'empty')).not.toHaveProperty(
      'source'
    );

    expect(mockListWatchlistEntitySources).toHaveBeenCalledTimes(1);
    expect(mockListWatchlistEntitySources).toHaveBeenCalledWith(
      expect.objectContaining({ watchlistId: 'manual-and-source' })
    );
  });

  it('preserves the manual source label when fetching entity sources fails', async () => {
    mockListWatchlistEntitySources.mockRejectedValue(new Error('Request failed'));

    const { result } = renderHook(() => useWatchlistsTableData('default', 0, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.visibleRecords).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'manual-and-source', source: 'Manual' }),
        ])
      );
    });
  });
});
