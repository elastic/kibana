/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate, uniq } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { getWatchlistName } from '../../../../../common/entity_analytics/watchlists/constants';
import type { WatchlistConfigClient } from '../../../../lib/entity_analytics/watchlists/management/watchlist_config';

/** Watchlist names are written by users, so a long one is cut. */
const MAX_WATCHLIST_NAME_LENGTH = 100;

/** The names of the watchlists in the space, by id. A failure means no names, never a failed brief. */
export const readWatchlistNames = async (
  watchlistConfigClient: WatchlistConfigClient,
  logger: Logger
): Promise<Map<string, string>> => {
  try {
    const watchlists = await watchlistConfigClient.list();
    return new Map(watchlists.map(({ id, name }) => [id, name]));
  } catch (error) {
    logger.debug(`AI brief: no watchlist names: ${error.message}`);
    return new Map();
  }
};

/** The names of the watchlists with these ids. An id with no name is a deleted watchlist, so it is dropped, as the flyout does. */
export const getWatchlistNames = (
  watchlistIds: readonly string[],
  namesById: Map<string, string>
): string[] =>
  uniq(
    watchlistIds.flatMap((id) => {
      const name = namesById.get(id) ?? getWatchlistName(id);
      return name === id ? [] : [truncate(name, { length: MAX_WATCHLIST_NAME_LENGTH })];
    })
  );
