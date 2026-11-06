/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useManualWatchlistEntities } from '../../../api/hooks/use_manual_watchlist_entities';
import { useUnassignWatchlistEntity } from '../../../api/hooks/use_unassign_watchlist_entity';
import { useWatchlistsPrivileges } from '../../../api/hooks/use_watchlists_privileges';
import { ManualEntitiesSection } from './manual_entities_section';

jest.mock('../../../api/hooks/use_manual_watchlist_entities');
jest.mock('../../../api/hooks/use_unassign_watchlist_entity');
jest.mock('../../../api/hooks/use_watchlists_privileges');

const mockUseManual = useManualWatchlistEntities as jest.Mock;
const mockUseUnassign = useUnassignWatchlistEntity as jest.Mock;
const mockUsePrivileges = useWatchlistsPrivileges as jest.Mock;

const mockRemove = jest.fn();

const JANE = { euid: 'user:jane', name: 'jane', type: 'user', sources: ['manual'] };
const NAMELESS = { euid: 'host:web-01', sources: ['manual', 'index'] };

const page = (entities: unknown[], total = entities.length) => ({
  data: { entities, total, page: 1, per_page: 10 },
  isLoading: false,
  isError: false,
});

const renderSection = () =>
  render(
    <TestProviders>
      <ManualEntitiesSection watchlistId="wl-1" watchlistName="Vendors" />
    </TestProviders>
  );

describe('ManualEntitiesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseManual.mockReturnValue(page([JANE, NAMELESS]));
    mockUseUnassign.mockReturnValue({ mutate: mockRemove, isLoading: false, variables: undefined });
    mockUsePrivileges.mockReturnValue({
      data: { has_all_required: true },
      error: null,
      isLoading: false,
    });
  });

  it('lists each entity by name, or by id when it has none, with its type', () => {
    renderSection();

    expect(screen.getByText('jane')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('host:web-01')).toBeInTheDocument();
    expect(mockUseManual).toHaveBeenCalledWith({ watchlistId: 'wl-1', page: 1, perPage: 10 });
  });

  it('says so when no entity was added by hand', () => {
    mockUseManual.mockReturnValue(page([]));
    renderSection();

    expect(screen.getByTestId('watchlistManualEntitiesEmpty')).toHaveTextContent(
      'No entities have been added to this watchlist by hand'
    );
    expect(screen.queryByTestId('watchlistManualEntitiesTable')).not.toBeInTheDocument();
  });

  it('shows an error, not an empty list, when the entities fail to load', () => {
    mockUseManual.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderSection();

    expect(screen.getByTestId('watchlistManualEntitiesError')).toBeInTheDocument();
    expect(screen.queryByTestId('watchlistManualEntitiesEmpty')).not.toBeInTheDocument();
  });

  it('shows a spinner while the entities load', () => {
    mockUseManual.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderSection();

    expect(screen.getByTestId('watchlistManualEntitiesLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('watchlistManualEntitiesEmpty')).not.toBeInTheDocument();
  });

  describe('removing an entity', () => {
    it('removes it at once, without asking to confirm', () => {
      renderSection();

      fireEvent.click(screen.getByRole('button', { name: 'Remove jane from Vendors' }));

      expect(mockRemove).toHaveBeenCalledTimes(1);
      expect(mockRemove).toHaveBeenCalledWith({ watchlistId: 'wl-1', euid: 'user:jane' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('names each button after its entity and watchlist', () => {
      renderSection();

      expect(
        screen.getByRole('button', { name: 'Remove host:web-01 from Vendors' })
      ).toBeInTheDocument();
    });

    it('disables every remove button while one removal is running', () => {
      mockUseUnassign.mockReturnValue({
        mutate: mockRemove,
        isLoading: true,
        variables: { watchlistId: 'wl-1', euid: 'user:jane' },
      });
      renderSection();

      expect(screen.getByTestId('watchlistManualEntityRemove-user:jane')).toBeDisabled();
      expect(screen.getByTestId('watchlistManualEntityRemove-host:web-01')).toBeDisabled();
    });
  });

  describe('without permission to modify watchlists', () => {
    it.each([
      ['they are missing', { data: { has_all_required: false }, error: null, isLoading: false }],
      ['they are still loading', { data: undefined, error: null, isLoading: true }],
      [
        'they could not be read',
        { data: { has_all_required: true }, error: new Error('boom'), isLoading: false },
      ],
    ])('disables the remove buttons when the privileges %s', (_, privileges) => {
      mockUsePrivileges.mockReturnValue(privileges);
      renderSection();

      expect(screen.getByTestId('watchlistManualEntityRemove-user:jane')).toBeDisabled();
    });

    it('says why, in a tooltip', async () => {
      mockUsePrivileges.mockReturnValue({
        data: { has_all_required: false },
        error: null,
        isLoading: false,
      });
      renderSection();

      fireEvent.mouseOver(screen.getByTestId('watchlistManualEntityRemove-user:jane'));

      expect(
        await screen.findByText('You do not have permission to modify watchlists')
      ).toBeInTheDocument();
    });
  });

  describe('paging', () => {
    const TEN = Array.from({ length: 10 }, (_, i) => ({
      euid: `user:u${i}`,
      name: `user ${i}`,
      type: 'user',
      sources: ['manual'],
    }));

    it('pages the list, 10 at a time, with the page sizes of the other flyout tables', () => {
      mockUseManual.mockReturnValue(page(TEN, 25));
      renderSection();

      fireEvent.click(screen.getByTestId('pagination-button-1'));
      expect(mockUseManual).toHaveBeenLastCalledWith({ watchlistId: 'wl-1', page: 2, perPage: 10 });

      fireEvent.click(screen.getByTestId('tablePaginationPopoverButton'));
      fireEvent.click(screen.getByTestId('tablePagination-25-rows'));
      expect(mockUseManual).toHaveBeenLastCalledWith({ watchlistId: 'wl-1', page: 1, perPage: 25 });
    });

    it('goes back a page when the last entity of the last page is removed', () => {
      mockUseManual.mockImplementation(({ page: requested }: { page: number }) =>
        requested === 2 ? page([], 10) : page(TEN, 25)
      );
      renderSection();

      fireEvent.click(screen.getByTestId('pagination-button-1'));

      expect(mockUseManual).toHaveBeenLastCalledWith({ watchlistId: 'wl-1', page: 1, perPage: 10 });
    });
  });
});
