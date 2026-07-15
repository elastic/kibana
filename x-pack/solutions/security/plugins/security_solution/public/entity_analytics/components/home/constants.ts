/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';

export const ENTITY_ANALYTICS_TABLE_ID = 'entity-analytics-home-table';

// The EA homepage hides the global date picker, so alert queries on this page
// use a fixed "last 30 days" window instead of the global time range.
export const ENTITY_ANALYTICS_ALERTS_FROM = 'now-30d';
export const ENTITY_ANALYTICS_ALERTS_TO = 'now';

/**
 * Maps a scope ID to the alert query time range that should be used when the
 * entity flyout (right panel) or left-panel insights tab is opened from that
 * scope. Components look up their `scopeId` here and, when a match is found,
 * use the returned `{ from, to }` instead of the global Kibana time range.
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

const LOCAL_STORAGE_PREFIX = 'entityAnalytics';
export const ENTITY_ANALYTICS_LOCAL_STORAGE_COLUMNS_KEY = `${LOCAL_STORAGE_PREFIX}:columns`;
export const ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY = `${LOCAL_STORAGE_PREFIX}:dataTable:pageSize`;
