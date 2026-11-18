/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_EVENTS_SEARCH_FROM = 'now-7d';
export const DEFAULT_EVENTS_SEARCH_TO = 'now';

/** How long a `recovering` event may go without a new version before the cleanup closes it. */
export const DEFAULT_STALE_RECOVERING_AFTER_HOURS = 48;
export const MAX_STALE_RECOVERING_AFTER_HOURS = 720;
