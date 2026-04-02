/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreBucket } from '../../types';
import type { Modifier } from './types';

export interface WatchlistModifierInfo {
  id: string;
  name: string;
  riskModifier: number;
}

/**
 * Applies watchlist modifiers sourced from the entity store.
 *
 * For each bucket, looks up the entity's watchlist membership by identifier
 * value in the pre-built `watchlistsByIdentifier` map (keyed by the same
 * identifier value that appears in `bucket.key[identifierField]`).
 *
 * When an entity belongs to multiple watchlists their `riskModifier` values
 * are multiplied together; the first watchlist in the list is used for
 * subtype and metadata.
 */
export const applyEntityStoreWatchlistModifier = ({
  page,
  watchlistsByIdentifier,
  globalWeight,
}: {
  page: {
    buckets: RiskScoreBucket[];
    identifierField: string;
  };
  watchlistsByIdentifier: Map<string, WatchlistModifierInfo[]>;
  globalWeight?: number;
}): Array<Modifier<'watchlist'> | undefined> => {
  if (page.buckets.length === 0) {
    return [];
  }

  return page.buckets.map((bucket) => {
    const identifierValue = bucket.key[page.identifierField];
    const watchlists = watchlistsByIdentifier.get(identifierValue);

    if (!watchlists?.length) {
      return undefined;
    }

    const combinedModifier = watchlists.reduce((product, wl) => product * wl.riskModifier, 1);
    const primaryWatchlist = watchlists[0];
    const weightedModifier =
      globalWeight !== undefined ? combinedModifier * globalWeight : combinedModifier;

    return {
      type: 'watchlist' as const,
      subtype: primaryWatchlist.name,
      modifier_value: weightedModifier,
      metadata: {
        watchlist_id: primaryWatchlist.id,
      },
    };
  });
};
