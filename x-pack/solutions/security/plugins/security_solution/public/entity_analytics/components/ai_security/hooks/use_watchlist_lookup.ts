/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useGetWatchlists } from '../../../api/hooks/use_get_watchlists';
import { getWatchlistName } from '../../../../../common/entity_analytics/watchlists/constants';

export interface WatchlistLabel {
  readonly id: string;
  readonly name: string;
  readonly riskModifier?: number;
}

export type WatchlistLookup = (ids: readonly string[]) => WatchlistLabel[];

/** Names and risk modifiers for watchlist IDs, read from the watchlist list API as the user flyout does. */
export const useWatchlistLookup = (): WatchlistLookup => {
  const { data } = useGetWatchlists();
  const byId = useMemo(
    () =>
      new Map(
        (data ?? []).flatMap(({ id, name, riskModifier }) =>
          id ? [[id, { id, name, riskModifier }] as const] : []
        )
      ),
    [data]
  );
  return useCallback(
    (ids) => ids.map((id) => byId.get(id) ?? { id, name: getWatchlistName(id) }),
    [byId]
  );
};
