/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { useOpenWatchlistFromUrl } from './use_open_watchlist_from_url';

const renderWithUrl = (search: string) => {
  const history = createMemoryHistory({
    initialEntries: [`/entity_analytics_management/watchlists${search}`],
  });
  const openEdit = jest.fn();
  renderHook(() => useOpenWatchlistFromUrl(openEdit), {
    wrapper: ({ children }) => <Router history={history}>{children}</Router>,
  });
  return { history, openEdit };
};

describe('useOpenWatchlistFromUrl', () => {
  it('does nothing without the editWatchlistId param', () => {
    const { history, openEdit } = renderWithUrl('?foo=bar');

    expect(openEdit).not.toHaveBeenCalled();
    expect(history.location.search).toBe('?foo=bar');
  });

  it('opens the edit flyout for the watchlist in the URL and removes only that param', () => {
    const { history, openEdit } = renderWithUrl('?editWatchlistId=wl-1&foo=bar');

    expect(openEdit).toHaveBeenCalledTimes(1);
    expect(openEdit).toHaveBeenCalledWith('wl-1');
    expect(history.location.pathname).toBe('/entity_analytics_management/watchlists');
    expect(history.location.search).toBe('?foo=bar');
  });
});
