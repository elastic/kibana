/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pipeline execution limits and defaults
 *
 * Consolidates magic numbers from workflow steps, routes, and config files
 * into a single source of truth with documented rationale.
 */
export const PIPELINE_LIMITS = {
  /** Maximum alerts fetched per pipeline run (ES max result window) */
  MAX_ALERTS_PER_RUN: 10_000,

  /** Maximum lookback window in minutes (7 days - prevents unbounded queries) */
  MAX_LOOKBACK_MINUTES: 10_080,

  /** Default lookback window (15 minutes - balance freshness vs load) */
  DEFAULT_LOOKBACK_MINUTES: 15,

  /** Default max alerts (balance processing time vs coverage) */
  DEFAULT_MAX_ALERTS: 500,

  /** Max open cases evaluated for matching (performance limit - O(n*m) complexity) */
  MAX_CASES_TO_EVALUATE: 100,

  /** Default case match threshold (30% entity overlap) */
  DEFAULT_CASE_MATCH_THRESHOLD: 0.3,

  /** Minimum new alerts required to trigger Attack Discovery */
  MIN_ALERTS_FOR_AD: 2,

  /** Jaccard similarity threshold for lexical deduplication */
  JACCARD_SIMILARITY_THRESHOLD: 0.85,

  /** ELSER similarity threshold for semantic deduplication (Phase 2) */
  ELSER_SIMILARITY_THRESHOLD: 0.75,

  /** Temporal decay period for case matching (days) */
  TEMPORAL_DECAY_DAYS: 30,
} as const;

/**
 * Safe alert index pattern regex
 * Only allows .alerts-security.alerts-* patterns to prevent ES injection
 */
export const SAFE_ALERTS_INDEX_PATTERN = /^\.alerts-security\.alerts-[a-z0-9*-]+$/;
