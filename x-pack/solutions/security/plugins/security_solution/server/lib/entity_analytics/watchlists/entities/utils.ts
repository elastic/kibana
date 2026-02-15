/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_ANALYTICS_WATCHLISTS_PREFIX = '.entity-analytics.watchlists';

export const getIndexForWatchlist = (watchlistName: string, namespace: string) =>
  `${ENTITY_ANALYTICS_WATCHLISTS_PREFIX}.${watchlistName}-${namespace}`;
