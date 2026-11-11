/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Severity filters for the Nightshift landing page event list. */
export const NIGHTSHIFT_LANDING_SEVERITIES = ['critical', 'high'] as const;

/** How often to poll the server (status + result data) while a significant events pipeline is running. */
export const RUNNING_POLL_INTERVAL_MS = 5 * 1000;

/** Occurrence window for pages without a time picker (Knowledge Indicators, Sources). */
export const FIXED_OCCURRENCES_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;
