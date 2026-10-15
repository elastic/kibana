/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineConfig } from '../../../common/detection_engine/types';

/**
 * Prototype storage. Plain hidden indices instead of data streams, because events and state
 * update in place. Every document carries `space_id`.
 */
export const ENGINE_INDICES = {
  /** Every evaluation of every series, breaching or not. The baseline check reads these. */
  observations: '.significant_events-engine-observations',
  /** Detections in the common format, with the baseline decision and the outcome. */
  detections: '.significant_events-engine-detections',
  /** Current state of each significant event, one document per event. */
  events: '.significant_events-engine-events',
  /** What the engine did and why, including the decisions not to raise an event. */
  activity: '.significant_events-engine-activity',
  /** Config, lab state, last run and memory notes. */
  state: '.significant_events-engine-state',
} as const;

export const MINUTE_MS = 60_000;

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  strategies: {
    ki_rules: { mode: 'live', daily_cap: 10 },
    health_checks: { mode: 'live', daily_cap: 10 },
    customer_alerts: { mode: 'live', daily_cap: 20 },
    // The riskiest strategy starts as a trial, as the evolution path requires.
    new_log_patterns: { mode: 'trial', daily_cap: 5 },
  },
  agent: { kind: 'heuristic' },
  baseline: { min_samples: 10, history_buckets: 60, mad_k: 3 },
  bucket_minutes: 1,
  join_window_minutes: 60,
  quiet_period_buckets: 2,
  worse_margin: 0.25,
  max_agent_calls_per_run: 8,
  publish_to_alerting_v2: true,
};

/** Data stream the lab writes its synthetic logs to. */
export const LAB_LOGS_INDEX = 'logs-detectionlab-default';
export const LAB_SOURCE_TITLE = 'Detection engine lab';
