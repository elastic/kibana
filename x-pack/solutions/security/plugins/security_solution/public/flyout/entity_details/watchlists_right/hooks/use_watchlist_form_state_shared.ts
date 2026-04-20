/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useExpandableFlyoutState } from '@kbn/expandable-flyout';
import type { CreateWatchlistRequestBodyInput } from '../../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { WatchlistsFlyoutKey } from '../../shared/constants';
import { MAX_WATCHLIST_DESCRIPTION_LENGTH, MAX_WATCHLIST_NAME_LENGTH } from '../constants';

export const getDefaultWatchlist = (): CreateWatchlistRequestBodyInput => ({
  name: '',
  description: '',
  riskModifier: 1.5,
  managed: false,
});

export const getWatchlistFieldLengthValidation = (watchlist: CreateWatchlistRequestBodyInput) => ({
  isNameTooLong: watchlist.name.length > MAX_WATCHLIST_NAME_LENGTH,
  isDescriptionTooLong: (watchlist.description ?? '').length > MAX_WATCHLIST_DESCRIPTION_LENGTH,
});

export const useResetEditsOnFlyoutOpen = (setHasUserEdits: (value: boolean) => void) => {
  const { right } = useExpandableFlyoutState();
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const isOpen = right?.id === WatchlistsFlyoutKey;
    if (isOpen && !wasOpenRef.current) {
      setHasUserEdits(false);
    }
    wasOpenRef.current = isOpen;
  }, [right?.id, setHasUserEdits]);
};
