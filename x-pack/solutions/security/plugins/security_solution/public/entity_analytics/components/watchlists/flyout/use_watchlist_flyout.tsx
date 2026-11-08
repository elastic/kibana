/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { WatchlistsFlyoutMode } from './hooks/use_watchlist_form_state';
import { WatchlistFlyout } from './watchlist_flyout';

interface WatchlistFlyoutState {
  mode: WatchlistsFlyoutMode;
  watchlistId?: string;
}

/**
 * Local open/close state for the watchlist create/edit flyout.
 * Render the returned `flyout` element wherever the caller lives; it is `null` while closed.
 */
export const useWatchlistFlyout = (spaceId: string | undefined) => {
  const [state, setState] = useState<WatchlistFlyoutState | null>(null);

  const openCreate = useCallback(() => setState({ mode: 'create' }), []);
  const openEdit = useCallback(
    (watchlistId: string) => setState({ mode: 'edit', watchlistId }),
    []
  );
  const close = useCallback(() => setState(null), []);

  const flyout = state ? (
    <WatchlistFlyout
      // remount when switching watchlists so the form never carries state over
      key={state.watchlistId ?? state.mode}
      mode={state.mode}
      watchlistId={state.watchlistId}
      spaceId={spaceId}
      onClose={close}
    />
  ) : null;

  return { openCreate, openEdit, flyout };
};
