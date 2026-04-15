/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_PER_PAGE,
  WatchlistConfigClient,
} from '../../../watchlists/management/watchlist_config';
import type { WatchlistObject } from '../../../../../../common/api/entity_analytics/watchlists/management/common.gen';

export const fetchWatchlistConfigs = async (
  params: ConstructorParameters<typeof WatchlistConfigClient>[0]
): Promise<Map<string, WatchlistObject>> => {
  try {
    const watchlistClient = new WatchlistConfigClient(params);
    const watchlists = await watchlistClient.list(MAX_PER_PAGE);
    return new Map(watchlists.map((w) => [w.id, w]));
  } catch (error) {
    params.logger.warn(
      `Error fetching watchlist configs: ${error}. Scoring will proceed without watchlist modifiers.`
    );
    return new Map();
  }
};
