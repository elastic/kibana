/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { WatchlistsManagementTable } from '.';

jest.mock('./hooks', () => ({
  useDeleteWatchlist: () => ({ mutate: jest.fn() }),
  useWatchlistsTableData: () => ({
    visibleRecords: [{ id: 'wl-1', name: 'Watchlist one', riskModifier: 1, managed: false }],
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
    inspect: { dsl: [], response: [] },
  }),
}));

jest.mock('../../flyout/watchlist_flyout', () => ({
  WatchlistFlyout: ({ mode, watchlistId }: { mode: string; watchlistId?: string }) => (
    <div data-test-subj="mockWatchlistFlyout">{`${mode}:${watchlistId ?? ''}`}</div>
  ),
}));

describe('WatchlistsManagementTable', () => {
  it('opens the edit flyout for the clicked row', () => {
    render(
      <TestProviders>
        <WatchlistsManagementTable spaceId="default" />
      </TestProviders>
    );
    expect(screen.queryByTestId('mockWatchlistFlyout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Edit watchlist'));

    expect(screen.getByTestId('mockWatchlistFlyout')).toHaveTextContent('edit:wl-1');
  });
});
