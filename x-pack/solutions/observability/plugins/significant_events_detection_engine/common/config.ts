/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionStrategyId, StrategyConfig } from './strategies';

/** Which discovery agent the engine asks. */
export type EngineAgentKind = 'heuristic' | 'agent_builder';

/** Engine settings per space. */
export interface EngineConfig {
  strategies: Record<DetectionStrategyId, StrategyConfig>;
  agent: {
    kind: EngineAgentKind;
    /** Model connector for the Agent Builder agent; the space default is used when absent. */
    connector_id?: string;
  };
  baseline: {
    /** Fewer samples than this and the series is still warming up. */
    min_samples: number;
    /** How many past buckets the check reads. */
    history_buckets: number;
    /** Threshold is median + k x scaled MAD. */
    mad_k: number;
  };
  /** Open events whose latest signal is this recent can receive join proposals. */
  join_window_minutes: number;
  /** Consecutive healthy buckets before a recovering event closes. */
  quiet_period_buckets: number;
  /** A dismissed problem must be this much worse (ratio) before it raises again. */
  worse_margin: number;
  /** Most agent calls in one run; the rest wait for the next run. */
  max_agent_calls_per_run: number;
  /** Most agent calls per UTC day in this space; past it, the heuristic agent decides. */
  max_agent_calls_per_day: number;
  /** Also write events to `.rule-events` as Alerting v2 alerts. */
  publish_to_alerting_v2: boolean;
}

/** Settings a person can change through the API; strategies merge field by field. */
export interface EngineConfigUpdate {
  strategies?: Partial<Record<DetectionStrategyId, StrategyConfig>>;
  agent?: EngineConfig['agent'];
  baseline?: Partial<EngineConfig['baseline']>;
  join_window_minutes?: number;
  quiet_period_buckets?: number;
  worse_margin?: number;
  max_agent_calls_per_run?: number;
  max_agent_calls_per_day?: number;
  publish_to_alerting_v2?: boolean;
}

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
  join_window_minutes: 60,
  quiet_period_buckets: 2,
  worse_margin: 0.25,
  max_agent_calls_per_run: 8,
  max_agent_calls_per_day: 500,
  publish_to_alerting_v2: true,
};
