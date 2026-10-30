/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { EDIT_WATCHLIST_URL_PARAM } from './constants';

/**
 * Opens the edit flyout for the watchlist named in the `editWatchlistId` query param, then drops
 * the param so closing the flyout or reloading the page doesn't reopen it.
 */
export const useOpenWatchlistFromUrl = (openEdit: (watchlistId: string) => void) => {
  const { search } = useLocation();
  const history = useHistory();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const watchlistId = params.get(EDIT_WATCHLIST_URL_PARAM);
    if (!watchlistId) {
      return;
    }

    openEdit(watchlistId);
    params.delete(EDIT_WATCHLIST_URL_PARAM);
    history.replace({ search: params.toString() });
  }, [history, openEdit, search]);
};
