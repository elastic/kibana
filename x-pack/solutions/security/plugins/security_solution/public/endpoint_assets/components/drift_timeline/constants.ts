/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TIMELINE_DEFAULTS = {
  TOTAL_RANGE_MS: 24 * 60 * 60 * 1000, // 24 hours total (past to now)
  MIN_GRANULARITY_MS: 5 * 60 * 1000,
  HISTOGRAM_INTERVAL: '30m',
} as const;

// Time markers in minutes relative to "now" (all negative = past)
export const TIME_MARKERS = [
  { value: -1440, label: '24h ago' },
  { value: -1080, label: '18h ago' },
  { value: -720, label: '12h ago' },
  { value: -360, label: '6h ago' },
  { value: -180, label: '3h ago' },
  { value: -60, label: '1h ago' },
  { value: 0, label: 'Now' },
] as const;
