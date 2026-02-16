/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface WatchlistTableItemType
  extends Record<string, string | string[] | number | undefined> {
  watchlist: string;
  number_of_users: number;
  risk_score_weighting?: number;
  source: string; // TODO update to enum (Integration | Index | CSV )
  last_updated: string; // e.g. 1 hour ago
}
