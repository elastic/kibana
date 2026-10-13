/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefRange } from '../../api/entity_analytics/executive_brief/common.gen';

export const EXECUTIVE_BRIEF_API_PATH = '/internal/entity_analytics/executive_brief' as const;
export const EXECUTIVE_BRIEF_STATUS_API_PATH = `${EXECUTIVE_BRIEF_API_PATH}/status` as const;
export const EXECUTIVE_BRIEF_API_VERSION = '1' as const;

/** Single index for all spaces; every read checks owner and space. */
export const EXECUTIVE_BRIEF_INDEX = '.entity_analytics.executive_briefs' as const;

export const EXECUTIVE_BRIEF_GENERATE_TASK_TYPE =
  'entity_analytics:executive_brief:generate' as const;
export const EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE =
  'entity_analytics:executive_brief:cleanup' as const;
export const EXECUTIVE_BRIEF_CLEANUP_TASK_ID =
  'entity_analytics:executive_brief:cleanup:1' as const;

/** Inference feature id used to resolve the connector. */
export const EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID = 'entity_analytics_executive_brief' as const;

export const BRIEF_RANGE_MS: Record<BriefRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export const BRIEF_LIMITS = {
  /** Signals running at once. */
  signalConcurrency: 3,
  /** Default per-signal timeout; a signal may declare a lower one. */
  signalTimeoutMs: 10_000,
  /** Budget for the whole gather stage; unfinished signals are aborted. */
  gatherBudgetMs: 45_000,
  /** Running briefs across the cluster before POST returns 429. */
  maxRunningBriefs: 5,
} as const;

export const BRIEF_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
/** Task Manager timeout for a generate run; generous because signals can be slow on large data. */
export const BRIEF_TASK_TIMEOUT = '15m' as const;
/** A job still pending or running this long after it started reads as interrupted. */
export const BRIEF_JOB_DEADLINE_MS = 15 * 60 * 1000;
