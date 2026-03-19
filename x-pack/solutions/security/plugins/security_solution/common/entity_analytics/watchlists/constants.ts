/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const WATCHLISTS_URL = `/api/entity_analytics/watchlists` as const;
export const WATCHLISTS_MANAGEMENT_URL = `${WATCHLISTS_URL}/management` as const;
export const WATCHLISTS_DATA_SOURCE_URL = `${WATCHLISTS_URL}/{watchlist_id}/entity_source` as const;
export const WATCHLISTS_DATA_SOURCE_LIST_URL = `${WATCHLISTS_DATA_SOURCE_URL}/list` as const;
