/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VendorResourceIdentifier } from '../types';

/**
 * Regex to match Sentinel watchlist references in KQL queries.
 * Matches `_GetWatchlist('WatchlistName')` or `_GetWatchlist("WatchlistName")`.
 */
const WATCHLIST_PATTERN = /_GetWatchlist\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * Extracts Microsoft Sentinel watchlist references from a KQL query string.
 * Watchlists are Sentinel's equivalent of lookup tables, referenced via
 * the `_GetWatchlist('name')` function in KQL.
 *
 * @param kqlQuery - The KQL query string to parse
 * @returns Array of identified resources with type 'watchlist'
 */
export const sentinelResourceIdentifier: VendorResourceIdentifier = (kqlQuery: string) => {
  const watchlists: string[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex before iteration to avoid state issues
  WATCHLIST_PATTERN.lastIndex = 0;
  while ((match = WATCHLIST_PATTERN.exec(kqlQuery)) !== null) {
    const name = match[1];
    if (name && !watchlists.includes(name)) {
      watchlists.push(name);
    }
  }

  return watchlists.map((name) => ({ type: 'lookup', name }));
};
