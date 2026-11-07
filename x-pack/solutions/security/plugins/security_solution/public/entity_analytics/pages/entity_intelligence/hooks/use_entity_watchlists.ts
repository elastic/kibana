/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../api/api';

/** A watchlist and the entity identifiers it currently resolves. */
export interface WatchlistMembership {
  id: string;
  name: string;
  managed: boolean;
  /** Lowercased entity identifiers on this watchlist (may be empty). */
  entityKeys: string[];
}

interface WatchlistListItem {
  id: string;
  name: string;
  managed?: boolean;
  entityCount?: number;
}

/**
 * Loads the real watchlists (`/api/entity_analytics/watchlists/list`) and, for
 * each, the entities it resolves. Produces a per-entity → watchlist-names map
 * and the list of watchlist names for the filter. When a watchlist resolves no
 * entities (as is the case for the system-managed list here), it still appears
 * as a filter option but contributes no memberships — an honest degradation.
 */
export const useEntityWatchlists = (enabled = true) => {
  const { fetchWatchlists, getWatchlist } = useEntityAnalyticsRoutes();

  const { data, isLoading, isError } = useQuery(
    ['entityIntelligenceEntitiesWatchlists'],
    async ({ signal }) => {
      const lists = (await fetchWatchlists({ signal })) as unknown as WatchlistListItem[];
      let isPartial = false;
      const memberships: WatchlistMembership[] = await Promise.all(
        (lists ?? []).map(async (list) => {
          let entityKeys: string[] = [];
          try {
            const detail = (await getWatchlist({ id: list.id, signal })) as unknown as {
              entities?: Array<{ id?: string; name?: string }>;
            };
            entityKeys = (detail.entities ?? [])
              .map((e) => (e.name ?? e.id ?? '').toLowerCase())
              .filter(Boolean);
          } catch (err) {
            isPartial = true;
            entityKeys = [];
          }
          return {
            id: list.id,
            name: list.name,
            managed: !!list.managed,
            entityKeys,
          };
        })
      );
      return { memberships, isPartial };
    },
    { enabled, retry: 1, refetchOnWindowFocus: false, keepPreviousData: true }
  );

  const watchlists = useMemo(() => data?.memberships ?? [], [data]);

  /** entityKeyLower → watchlist names it belongs to. */
  const watchlistsByEntity = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const watchlist of watchlists) {
      for (const key of watchlist.entityKeys) {
        map.set(key, [...(map.get(key) ?? []), watchlist.name]);
      }
    }
    return map;
  }, [watchlists]);

  /** All watchlist names, for the watchlist filter popover. */
  const watchlistNames = useMemo(
    () => [...new Set(watchlists.map((w) => w.name))].sort(),
    [watchlists]
  );

  return {
    watchlistsByEntity,
    watchlistNames,
    isLoading,
    isError,
    isPartial: data?.isPartial ?? false,
  };
};
