/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { useKibana } from '../../../../../common/lib/kibana';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { useWatchlistsTableData } from '../../../watchlists/components/watchlists_management_table/hooks';
import { useWatchlistFlyout } from '../../../watchlists/flyout/use_watchlist_flyout';
import { AddToWatchlistModal } from './add_to_watchlist_modal';

const mockAssignWatchlistEntities = jest.fn();

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/hooks/use_space_id');
jest.mock('../../../watchlists/components/watchlists_management_table/hooks');
jest.mock('../../../watchlists/flyout/use_watchlist_flyout');
jest.mock('../../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({ assignWatchlistEntities: mockAssignWatchlistEntities }),
}));

const mockUseWatchlistsTableData = useWatchlistsTableData as jest.Mock;
const mockOpenCreate = jest.fn();
const mockRefetch = jest.fn();
const toasts = { addSuccess: jest.fn(), addError: jest.fn() };

const WATCHLISTS = [
  { id: 'wl-1', name: 'Vendors', entityCount: 3, riskModifier: 1.5, source: 'Manual' },
  { id: 'wl-2', name: 'Contractors', entityCount: 0, riskModifier: 1, source: undefined },
];

const mockTableData = (overrides = {}) =>
  mockUseWatchlistsTableData.mockReturnValue({
    visibleRecords: WATCHLISTS,
    isLoading: false,
    hasError: false,
    refetch: mockRefetch,
    ...overrides,
  });

const renderModal = (assignedWatchlistIds: string[] = []) => {
  const onClose = jest.fn();
  const onAssigned = jest.fn();
  render(
    <TestProviders>
      <AddToWatchlistModal
        entityId="user:jane"
        assignedWatchlistIds={assignedWatchlistIds}
        onClose={onClose}
        onAssigned={onAssigned}
      />
    </TestProviders>
  );
  return { onClose, onAssigned };
};

describe('AddToWatchlistModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { notifications: { toasts } } });
    (useSpaceId as jest.Mock).mockReturnValue('default');
    mockTableData();
    (useWatchlistFlyout as jest.Mock).mockImplementation(() => {
      const [isOpen, setIsOpen] = React.useState(false);
      return {
        openCreate: () => {
          mockOpenCreate();
          setIsOpen(true);
        },
        flyout: isOpen ? <div data-test-subj="mockCreateWatchlistFlyout" /> : null,
      };
    });
  });

  it('is titled "Select watchlist" and lists each watchlist', () => {
    renderModal();
    expect(screen.getByText('Select watchlist')).toBeInTheDocument();
    expect(screen.getByText('Vendors')).toBeInTheDocument();
    expect(screen.getByText('Contractors')).toBeInTheDocument();
  });

  it('assigns the entity on Select, refreshes the grid and closes', async () => {
    mockAssignWatchlistEntities.mockResolvedValue({ failed: 0, not_found: 0, items: [] });
    const { onClose, onAssigned } = renderModal();

    fireEvent.click(screen.getByTestId('eaGridAddToWatchlistSelect-wl-1'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockAssignWatchlistEntities).toHaveBeenCalledWith({
      watchlistId: 'wl-1',
      body: { euids: ['user:jane'] },
    });
    expect(onAssigned).toHaveBeenCalledTimes(1);
    expect(toasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal open and shows an error when the entity is not found', async () => {
    mockAssignWatchlistEntities.mockResolvedValue({
      failed: 0,
      not_found: 1,
      items: [{ euid: 'user:jane', status: 'not_found', error: 'Entity not found' }],
    });
    const { onClose, onAssigned } = renderModal();

    fireEvent.click(screen.getByTestId('eaGridAddToWatchlistSelect-wl-1'));

    await waitFor(() => expect(toasts.addError).toHaveBeenCalledTimes(1));
    expect(toasts.addSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onAssigned).not.toHaveBeenCalled();
  });

  it('disables a watchlist the entity is already on', () => {
    renderModal(['wl-1']);
    const added = screen.getByTestId('eaGridAddToWatchlistSelect-wl-1');
    expect(added).toBeDisabled();
    expect(added).toHaveTextContent('Added');
    expect(screen.getByTestId('eaGridAddToWatchlistSelect-wl-2')).toBeEnabled();

    fireEvent.click(added);
    expect(mockAssignWatchlistEntities).not.toHaveBeenCalled();
  });

  it('says there are no watchlists when none exist', () => {
    mockTableData({ visibleRecords: [] });
    renderModal();
    expect(screen.getByTestId('eaGridAddToWatchlistEmpty')).toHaveTextContent(
      'No watchlists to display'
    );
    expect(screen.getByTestId('eaGridAddToWatchlistEmpty')).toHaveTextContent(
      'Create a watchlist or edit your search.'
    );
    expect(screen.getAllByTestId('eaGridAddToWatchlistCreate')).toHaveLength(2);
  });

  it('shows how many watchlists are listed', () => {
    renderModal();
    expect(screen.getByTestId('eaGridAddToWatchlistShowing')).toHaveTextContent(
      'Showing 2 of 2 watchlists'
    );
  });

  it('filters the list by name or source from the search box', () => {
    renderModal();
    fireEvent.change(screen.getByTestId('eaGridAddToWatchlistSearch'), {
      target: { value: 'vend' },
    });
    expect(screen.getByText('Vendors')).toBeInTheDocument();
    expect(screen.queryByText('Contractors')).not.toBeInTheDocument();
    expect(screen.getByTestId('eaGridAddToWatchlistShowing')).toHaveTextContent(
      'Showing 1 of 1 watchlist'
    );

    fireEvent.change(screen.getByTestId('eaGridAddToWatchlistSearch'), {
      target: { value: 'manual' },
    });
    expect(screen.getByText('Vendors')).toBeInTheDocument();
  });

  it('explains that entities added here are kept on rule-based watchlists', () => {
    renderModal();
    expect(screen.getByTestId('eaGridAddToWatchlistHint')).toHaveTextContent(
      'Rule-based watchlists add matching entities automatically. Entities you add here are kept, even if they do not match the rules.'
    );
  });

  it('hides the hint when there are no watchlists', () => {
    mockTableData({ visibleRecords: [] });
    renderModal();
    expect(screen.queryByTestId('eaGridAddToWatchlistHint')).not.toBeInTheDocument();
  });

  it('hides the hint when the watchlists fail to load', () => {
    mockTableData({ visibleRecords: [], hasError: true });
    renderModal();
    expect(screen.queryByTestId('eaGridAddToWatchlistHint')).not.toBeInTheDocument();
  });

  it('names each button after its watchlist, so a screen reader can tell them apart', () => {
    renderModal(['wl-1']);

    expect(screen.getByRole('button', { name: 'Select Contractors' })).toBeEnabled();
    // The disabled "Added" button is not focusable, so its focusable wrapper carries the name.
    expect(screen.getByRole('group', { name: 'Added to Vendors' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Added to Vendors' })).toBeDisabled();
  });

  it('puts each source on its own line', () => {
    mockTableData({
      visibleRecords: [{ ...WATCHLISTS[0], source: 'entityanalytics_okta, entityanalytics_ad' }],
    });
    renderModal();
    expect(screen.getByText('entityanalytics_okta')).toBeInTheDocument();
    expect(screen.getByText('entityanalytics_ad')).toBeInTheDocument();
  });

  it('pages the list and lets the user change the page size', () => {
    mockTableData({
      visibleRecords: Array.from({ length: 12 }, (_, i) => ({
        id: `wl-${i}`,
        name: `Watchlist ${String(i).padStart(2, '0')}`,
        entityCount: i,
        riskModifier: 1,
        updatedAt: `2026-11-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      })),
    });
    renderModal();
    expect(screen.getByTestId('eaGridAddToWatchlistShowing')).toHaveTextContent(
      'Showing 10 of 12 watchlists'
    );
    fireEvent.click(screen.getByTestId('pagination-button-1'));
    expect(screen.getByTestId('eaGridAddToWatchlistShowing')).toHaveTextContent(
      'Showing 2 of 12 watchlists'
    );
  });

  it('shows every source when two share a label', () => {
    mockTableData({
      visibleRecords: [{ ...WATCHLISTS[0], source: 'Index, Index, Manual' }],
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderModal();
    expect(screen.getAllByText('Index')).toHaveLength(2);
    expect(screen.getByText('Manual')).toBeInTheDocument();
    // React only warns about repeated keys, so the warning is the failure.
    expect(consoleError.mock.calls.some(([message]) => String(message).includes('same key'))).toBe(
      false
    );
    consoleError.mockRestore();
  });

  it('sorts names without regard to case', () => {
    mockTableData({
      visibleRecords: [
        { id: 'z', name: 'Zeta', entityCount: 1, riskModifier: 1 },
        { id: 'a', name: 'alpha', entityCount: 1, riskModifier: 1 },
        { id: 'b', name: 'Beta', entityCount: 1, riskModifier: 1 },
      ],
    });
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Watchlist Name/ }));

    const order = screen
      .getAllByTestId(/eaGridAddToWatchlistSelect-/)
      .map((button) => button.getAttribute('data-test-subj'));
    expect(order).toEqual([
      'eaGridAddToWatchlistSelect-a',
      'eaGridAddToWatchlistSelect-b',
      'eaGridAddToWatchlistSelect-z',
    ]);
  });

  it('opens the create watchlist flyout from the toolbar button', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('eaGridAddToWatchlistCreate'));
    expect(mockOpenCreate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mockCreateWatchlistFlyout')).toBeInTheDocument();
  });

  it('hides the modal while the create flyout is open', () => {
    renderModal();
    expect(screen.getByTestId('eaGridAddToWatchlistModal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('eaGridAddToWatchlistCreate'));
    expect(screen.queryByTestId('eaGridAddToWatchlistModal')).not.toBeInTheDocument();
  });

  it('refetches the watchlists from the refresh button', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('eaGridAddToWatchlistRefresh'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('shows an error, not an empty list, when watchlists fail to load', () => {
    mockTableData({ visibleRecords: [], hasError: true });
    renderModal();
    expect(screen.getByTestId('eaGridAddToWatchlistLoadError')).toBeInTheDocument();
    expect(screen.queryByTestId('eaGridAddToWatchlistEmpty')).not.toBeInTheDocument();
  });

  it('does not show the empty message while loading', () => {
    mockTableData({ visibleRecords: [], isLoading: true });
    renderModal();
    expect(screen.queryByTestId('eaGridAddToWatchlistEmpty')).not.toBeInTheDocument();
  });

  it('closes on Cancel', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
