/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SUPPORTED_FILE_TYPES = [
  'text/csv',
  'text/plain',
  '.csv', // if windows can't recognise the file extension.
];

/**
 * Query param that opens a watchlist's edit flyout on the Watchlists management tab,
 * e.g. `/entity_analytics_management/watchlists?editWatchlistId=<id>`. Used by the Agent Builder
 * UI-navigation skill (`server/agent_builder/skills/ui_navigation.ts` mirrors this value).
 */
export const EDIT_WATCHLIST_URL_PARAM = 'editWatchlistId';
