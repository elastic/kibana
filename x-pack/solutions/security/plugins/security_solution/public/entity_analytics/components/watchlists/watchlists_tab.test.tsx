/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { WatchlistsTab } from './watchlists_tab';

jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'default',
}));

jest.mock('../entity_store/hooks/use_entity_store', () => ({
  useEntityStoreStatus: () => ({
    data: { status: 'running' },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../api/hooks/use_watchlists_privileges', () => ({
  useWatchlistsPrivileges: () => ({
    data: { has_read_permissions: true, has_write_permissions: true, has_all_required: true },
    error: null,
    isLoading: false,
  }),
}));

jest.mock('.', () => ({
  Watchlists: () => <div data-test-subj="mockWatchlists" />,
}));

jest.mock('./flyout/watchlist_flyout', () => ({
  WatchlistFlyout: ({ mode, watchlistId }: { mode: string; watchlistId?: string }) => (
    <div data-test-subj="mockWatchlistFlyout">{`${mode}:${watchlistId ?? ''}`}</div>
  ),
}));

const renderTab = (search = '') => {
  const history = createMemoryHistory({
    initialEntries: [`/entity_analytics_management/watchlists${search}`],
  });
  render(
    <I18nProvider>
      <Router history={history}>
        <WatchlistsTab />
      </Router>
    </I18nProvider>
  );
  return { history };
};

describe('WatchlistsTab', () => {
  it('opens the create flyout from the create button', () => {
    renderTab();
    expect(screen.queryByTestId('mockWatchlistFlyout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('watchlistsTabCreateButton'));

    expect(screen.getByTestId('mockWatchlistFlyout')).toHaveTextContent('create:');
  });

  it('opens the edit flyout for the watchlist in the editWatchlistId query param', () => {
    const { history } = renderTab('?editWatchlistId=wl-1');

    expect(screen.getByTestId('mockWatchlistFlyout')).toHaveTextContent('edit:wl-1');
    expect(history.location.search).toBe('');
  });
});
