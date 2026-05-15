/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Poll the has-data endpoint every 2s. Fast enough to feel responsive once
// the collector starts emitting, slow enough not to hammer ES while the user
// is still installing.
export const OTEL_HOST_FETCH_INTERVAL_MS = 2000;

// Show troubleshooting guidance after 2 minutes without data. EDOT collector
// startup is typically well under a minute; 2 minutes covers slow networks /
// CDN downloads while still surfacing help before the user gives up.
export const OTEL_HOST_SHOW_TROUBLESHOOTING_DELAY_MS = 120_000;
