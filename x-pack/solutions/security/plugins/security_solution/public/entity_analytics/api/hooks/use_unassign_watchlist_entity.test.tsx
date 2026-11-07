/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { ENTITY_GRID_QUERY_KEY } from '../../components/home/entities_grid/common';
import { GET_WATCHLISTS_QUERY_KEY } from './use_get_watchlists';
import { MANUAL_WATCHLIST_ENTITIES_QUERY_KEY } from './use_manual_watchlist_entities';
import { useUnassignWatchlistEntity } from './use_unassign_watchlist_entity';

const mockUnassign = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
jest.mock('../../../common/hooks/use_app_toasts');
jest.mock('../api', () => ({
  useEntityAnalyticsRoutes: () => ({ unassignWatchlistEntities: mockUnassign }),
}));

const setup = () => {
  const queryClient = new QueryClient();
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useUnassignWatchlistEntity(), { wrapper });
  return { result, invalidate };
};

describe('useUnassignWatchlistEntity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    });
  });

  it('removes the one entity, then refreshes the manual list, the watchlists and the grid', async () => {
    mockUnassign.mockResolvedValue({ successful: 1, failed: 0, not_found: 0, total: 1, items: [] });
    const { result, invalidate } = setup();

    await act(async () => {
      await result.current.mutateAsync({ watchlistId: 'wl-1', euid: 'user:jane' });
    });

    expect(mockUnassign).toHaveBeenCalledWith({
      watchlistId: 'wl-1',
      body: { euids: ['user:jane'] },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [MANUAL_WATCHLIST_ENTITIES_QUERY_KEY] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['watchlists-management-table'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: GET_WATCHLISTS_QUERY_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [ENTITY_GRID_QUERY_KEY] });
  });

  it('says the entity was removed, and that a rule can keep it on the watchlist', async () => {
    mockUnassign.mockResolvedValue({ successful: 1, failed: 0, not_found: 0, total: 1, items: [] });
    const { result } = setup();

    await act(async () => {
      await result.current.mutateAsync({ watchlistId: 'wl-1', euid: 'user:jane' });
    });

    expect(mockAddSuccess).toHaveBeenCalledWith({
      title: 'Entity removed from the watchlist',
      text: 'It stays on the watchlist if a rule also matches it.',
    });
    expect(mockAddError).not.toHaveBeenCalled();
  });

  it('shows an error toast, and no success toast, when the removal fails', async () => {
    mockUnassign.mockResolvedValue({
      successful: 0,
      failed: 0,
      not_found: 1,
      total: 1,
      items: [{ euid: 'user:jane', status: 'not_found', error: 'Entity not manually assigned' }],
    });
    const { result } = setup();

    await act(async () => {
      await expect(
        result.current.mutateAsync({ watchlistId: 'wl-1', euid: 'user:jane' })
      ).rejects.toThrow();
    });

    expect(mockAddError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Entity not manually assigned' }),
      {
        title: 'Failed to remove the entity from the watchlist',
      }
    );
    expect(mockAddSuccess).not.toHaveBeenCalled();
  });

  it.each([
    ['fails', { successful: 0, failed: 1, not_found: 0 }],
    ['is not manually assigned', { successful: 0, failed: 0, not_found: 1 }],
  ])('throws the server message, and refreshes nothing, when the entity %s', async (_, counts) => {
    mockUnassign.mockResolvedValue({
      ...counts,
      total: 1,
      items: [{ euid: 'user:jane', status: 'failure', error: 'Entity not manually assigned' }],
    });
    const { result, invalidate } = setup();

    await act(async () => {
      await expect(
        result.current.mutateAsync({ watchlistId: 'wl-1', euid: 'user:jane' })
      ).rejects.toThrow('Entity not manually assigned');
    });

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('throws a default message when the response gives none', async () => {
    mockUnassign.mockResolvedValue({ successful: 0, failed: 1, not_found: 0, total: 1, items: [] });
    const { result } = setup();

    await act(async () => {
      await expect(
        result.current.mutateAsync({ watchlistId: 'wl-1', euid: 'user:jane' })
      ).rejects.toThrow('Unable to remove the entity from the watchlist');
    });
  });
});
