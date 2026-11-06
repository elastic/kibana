/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useWatchlistsPrivileges } from '../../../../api/hooks/use_watchlists_privileges';
import { useWatchlistManualEntitiesEnabled } from '../../../../hooks/use_watchlist_manual_entities_enabled';
import { GET_WATCHLISTS_QUERY_KEY } from '../../../../api/hooks/use_get_watchlists';
import { ENTITY_GRID_QUERY_KEY } from '../common';
import type { AddToWatchlistModalProps } from '../components/add_to_watchlist_modal';
import { useAddToWatchlistAction } from './use_add_to_watchlist_action';

jest.mock('../../../../../common/hooks/use_experimental_features');
jest.mock('../../../../api/hooks/use_watchlists_privileges');
jest.mock('../../../../hooks/use_watchlist_manual_entities_enabled');

const mockModal = jest.fn((_: AddToWatchlistModalProps) => <div data-test-subj="mockModal" />);
jest.mock('../components/add_to_watchlist_modal', () => ({
  AddToWatchlistModal: (props: AddToWatchlistModalProps) => mockModal(props),
}));

const mockFlag = useIsExperimentalFeatureEnabled as jest.Mock;
const mockPrivileges = useWatchlistsPrivileges as jest.Mock;
const mockManualEntities = useWatchlistManualEntitiesEnabled as jest.Mock;

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const row = {
  'entity.id': 'user:jane',
  'entity.attributes.watchlists': ['wl-1'],
};

describe('useAddToWatchlistAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFlag.mockReturnValue(true);
    mockManualEntities.mockReturnValue(true);
    mockPrivileges.mockReturnValue({ data: { has_all_required: true }, error: null });
  });

  it('offers the action when watchlists are on and the user can manage them', () => {
    const { result } = renderHook(() => useAddToWatchlistAction(), { wrapper });
    expect(result.current.onAddToWatchlist).toBeDefined();
  });

  it.each([
    ['the feature flag is off', () => mockFlag.mockReturnValue(false)],
    ['the manually added entities flag is off', () => mockManualEntities.mockReturnValue(false)],
    [
      'the user lacks a required privilege',
      () => mockPrivileges.mockReturnValue({ data: { has_all_required: false }, error: null }),
    ],
    ['privileges are still loading', () => mockPrivileges.mockReturnValue({ data: undefined })],
    [
      'the privileges request failed',
      () =>
        mockPrivileges.mockReturnValue({
          data: { has_all_required: true },
          error: new Error('boom'),
        }),
    ],
  ])('hides the action when %s', (_, arrange) => {
    arrange();
    const { result } = renderHook(() => useAddToWatchlistAction(), { wrapper });
    expect(result.current.onAddToWatchlist).toBeUndefined();
  });

  it('opens the modal for the row, with the watchlists the entity is already on', () => {
    const { result } = renderHook(() => useAddToWatchlistAction(), { wrapper });
    expect(result.current.addToWatchlistModal).toBeNull();

    act(() => result.current.onAddToWatchlist?.(row));
    render(<>{result.current.addToWatchlistModal}</>, { wrapper });

    expect(mockModal).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'user:jane', assignedWatchlistIds: ['wl-1'] })
    );
  });

  describe('on a grouped row, whose watchlists field holds the whole group', () => {
    const openFor = (groupedRow: Record<string, unknown>) => {
      const { result } = renderHook(() => useAddToWatchlistAction(), { wrapper });
      act(() => result.current.onAddToWatchlist?.(groupedRow));
      render(<>{result.current.addToWatchlistModal}</>, { wrapper });
      return mockModal.mock.calls[0][0].assignedWatchlistIds;
    };

    it("offers what the main entity is on itself, not the group's", () => {
      expect(
        openFor({
          'entity.id': 'user:a',
          'entity.attributes.watchlists': ['wl-1', 'wl-2'],
          own_watchlists: ['wl-1'],
        })
      ).toEqual(['wl-1']);
    });

    it('treats a main entity that is on no watchlist as on none, though its aliases are', () => {
      expect(
        openFor({
          'entity.id': 'user:a',
          'entity.attributes.watchlists': ['wl-1', 'wl-2'],
          own_watchlists: undefined,
        })
      ).toEqual([]);
    });
  });

  it('does not open the modal for a row without an entity id', () => {
    const { result } = renderHook(() => useAddToWatchlistAction(), { wrapper });
    act(() => result.current.onAddToWatchlist?.({}));
    expect(result.current.addToWatchlistModal).toBeNull();
  });

  it('refreshes the grid and the watchlist lists once an entity was added', () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAddToWatchlistAction(), { wrapper });
    act(() => result.current.onAddToWatchlist?.(row));
    render(<>{result.current.addToWatchlistModal}</>, { wrapper });

    act(() => mockModal.mock.calls[0][0].onAssigned());

    expect(invalidate).toHaveBeenCalledWith({ queryKey: [ENTITY_GRID_QUERY_KEY] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['watchlists-management-table'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: GET_WATCHLISTS_QUERY_KEY });
  });
});
