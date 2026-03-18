/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersIndex } from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import { getIndexForWatchlist } from '../../../../../common/entity_analytics/watchlists/utils';

export const getWatchlistJoin = (watchlistId: string, namespace: string) => {
  if (watchlistId === 'prebuilt-priv') {
    return `| RENAME @timestamp AS event_timestamp
  | LOOKUP JOIN ${getPrivilegedMonitorUsersIndex(namespace)} ON user.name
  | RENAME event_timestamp AS @timestamp
  | WHERE user.is_privileged == true`;
  }

  // Assuming regular watchlists are also joined on user.name for user risk panels.
  // In the future, this might need to dynamically join on host.name depending on the watchlist entity type.
  return `| RENAME @timestamp AS event_timestamp
  | LOOKUP JOIN ${getIndexForWatchlist(watchlistId, namespace)} ON user.name
  | RENAME event_timestamp AS @timestamp`; // TODO: this is not a guarantee. Ask Tiago / Mark for this one.
};
