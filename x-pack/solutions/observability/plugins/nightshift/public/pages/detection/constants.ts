/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_DETECTION_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

// Tabs paginate with this param; changing the time range resets it.
export const PAGE_QUERY_PARAM = 'page';
