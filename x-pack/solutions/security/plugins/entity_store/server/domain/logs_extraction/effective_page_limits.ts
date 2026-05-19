/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns the effective per-page log limit: when `maxLogsPerWindow` is active (> 0),
 * the page size is capped so a single probe never requests more logs than the remaining
 * run budget. When `maxLogsPerWindow` is 0 (disabled), `value` is returned unchanged.
 */
export const capAtMaxLogsPerWindow = (value: number, maxLogsPerWindow: number): number =>
  maxLogsPerWindow > 0 ? Math.min(value, maxLogsPerWindow) : value;
