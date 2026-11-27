/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getPrivilegedUserWatchlistSavedObjectId,
  getUnsanctionedAiAgentsWatchlistSavedObjectId,
  getWatchlistName,
} from './constants';

describe('getWatchlistName', () => {
  it.each([
    [
      'the privileged watchlist in a space',
      getPrivilegedUserWatchlistSavedObjectId('gen-demo'),
      'Privileged User',
    ],
    [
      'the privileged watchlist without a space',
      'privileged-user-monitoring-watchlist-id',
      'Privileged User',
    ],
    [
      'the unsanctioned AI agents watchlist in a space',
      getUnsanctionedAiAgentsWatchlistSavedObjectId('default'),
      'Unsanctioned AI agents',
    ],
    ['a custom watchlist, by its id', 'custom-watchlist-id', 'custom-watchlist-id'],
    [
      'an id that only shares a prefix',
      'privileged-user-monitoring-watchlist-idx',
      'privileged-user-monitoring-watchlist-idx',
    ],
  ])('names %s', (_description, watchlistId, expected) => {
    expect(getWatchlistName(watchlistId)).toBe(expected);
  });
});
