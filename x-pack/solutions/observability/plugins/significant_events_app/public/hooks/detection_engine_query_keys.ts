/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Every detection engine query shares this prefix, so one invalidation refreshes the page. */
export const DETECTION_ENGINE_QUERY_KEY = ['detectionEngine'] as const;

/** The page polls so a run started elsewhere, or by auto-run, shows up without a reload. */
export const DETECTION_ENGINE_REFETCH_INTERVAL_MS = 10_000;
