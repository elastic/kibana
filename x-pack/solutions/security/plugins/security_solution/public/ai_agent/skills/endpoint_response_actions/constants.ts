/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Maximum number of concurrent Response Actions allowed. */
export const MAX_CONCURRENT_ACTIONS = 5;

/** Polling interval in milliseconds for action status checks. */
export const POLL_INTERVAL_MS = 3000;

/** Maximum polling duration in milliseconds (30 seconds). */
export const MAX_POLL_DURATION_MS = 30000;

/** The number of concurrent actions that are currently in flight. */
export let currentConcurrentActions = 0;
