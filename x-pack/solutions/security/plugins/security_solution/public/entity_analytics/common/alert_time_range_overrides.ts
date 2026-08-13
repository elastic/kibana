/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_ANALYTICS_TABLE_ID,
  ENTITY_ANALYTICS_ALERTS_FROM,
  ENTITY_ANALYTICS_ALERTS_TO,
} from '../components/home/constants';

/**
 * Maps a scope ID to the alert query time range that should be used when an
 * entity flyout or insights tab is opened from that scope. Components look up
 * their `scopeId` here and, when a match is found, use the returned `{ from, to }`
 * instead of the global Kibana time range.
 *
 * Add an entry here whenever a new surface pins alerts to a fixed window.
 */
export const SCOPE_ALERT_TIME_RANGE_OVERRIDES: Readonly<
  Record<string, { from: string; to: string }>
> = {
  [ENTITY_ANALYTICS_TABLE_ID]: {
    from: ENTITY_ANALYTICS_ALERTS_FROM,
    to: ENTITY_ANALYTICS_ALERTS_TO,
  },
};
