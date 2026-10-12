/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EXECUTIVE_BRIEF_API_PATH = '/internal/entity_analytics/executive_brief' as const;
export const EXECUTIVE_BRIEF_API_VERSION = '1' as const;

/** Single index for all spaces; every read filters on owner and space. */
export const EXECUTIVE_BRIEF_INDEX = '.entity_analytics.executive_briefs' as const;

export const EXECUTIVE_BRIEF_GENERATE_TASK_TYPE =
  'entity_analytics:executive_brief:generate' as const;
export const EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE =
  'entity_analytics:executive_brief:cleanup' as const;
export const EXECUTIVE_BRIEF_CLEANUP_TASK_ID =
  'entity_analytics:executive_brief:cleanup:1' as const;

/** Inference feature id used to resolve the connector. */
export const EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID = 'entity_analytics_executive_brief' as const;

export const BRIEF_RANGES = ['24h', '7d', '30d'] as const;
export type BriefRange = (typeof BRIEF_RANGES)[number];

export const BRIEF_RANGE_MS: Record<BriefRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export const BRIEF_LIMITS = {
  /** Signals running at once within a phase. */
  signalConcurrency: 3,
  /** Default per-signal timeout; a signal may declare a lower one. */
  signalTimeoutMs: 10_000,
  /** Budget for the whole gather stage; unfinished signals are aborted. */
  gatherBudgetMs: 45_000,
  /** Candidate entities passed to entity-scoped signals. */
  maxCandidates: 25,
  /** Running briefs across the cluster before POST returns 429. */
  maxRunningBriefs: 5,
  maxThreats: 3,
  maxActions: 6,
  maxEntitiesPerThreat: 8,
  maxKeyEventsPerThreat: 12,
} as const;

export const BRIEF_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const BRIEF_HEARTBEAT_INTERVAL_MS = 10_000;
/** A running job whose heartbeat is older than this is reported as interrupted. */
export const BRIEF_STALE_HEARTBEAT_MS = 60_000;
export const BRIEF_TASK_TIMEOUT = '5m' as const;
