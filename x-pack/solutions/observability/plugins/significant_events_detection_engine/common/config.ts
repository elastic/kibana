/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LearningConfig } from './learning';
import type { SignalStrategyId, StrategyConfig } from './strategies';

/** Which triage agent the engine asks. */
export type EngineAgentKind = 'heuristic' | 'agent_builder';

/** Engine settings per space. */
export interface EngineConfig {
  strategies: Record<SignalStrategyId, StrategyConfig>;
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
    /**
     * For counts, the threshold is at least mean + k x sqrt(mean + 1): a count's spread grows
     * with its mean, so a series that matches a few lines a minute is not above normal at the
     * first busier minute. 0 turns the floor off.
     */
    count_noise_k: number;
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
  /** The learning loop: how far it may act, and the bar new candidates must pass. */
  learning: LearningConfig;
  /** Parts of triage that can be switched off, so the evals can measure what each one adds. */
  triage: TriageConfig;
}

/** Triage behaviours with a switch. Each is on by default; off restores the earlier behaviour. */
export interface TriageConfig {
  /** The AI step can search every open event; off, it only confirms or vetoes code's proposal. */
  event_search: boolean;
  /** A dependency links only services seen in the source it was learned from. */
  source_scoped_dependencies: boolean;
  /**
   * Services the topology saw logging the same request or trace ids count as dependencies.
   * Off, only dependencies from KIs and from logs that name another service count.
   */
  request_path_dependencies: boolean;
  /**
   * Code proposes joining an open event that holds a service the signal's own evidence rows
   * name, in the same source, even when no dependency is known.
   */
  evidence_named_joins: boolean;
  /** The Verifier tells the state machine when an open event's evidence is gone. */
  verifier_closes: boolean;
  /**
   * A closed event's series firing again is grouped again: the agent decides whether it is the
   * same problem, which reopens the event, or a different one, which opens a new event. Off,
   * the closed event always reopens.
   */
  regroup_recurrences: boolean;
  /** Customer alerts are judged by how often they fire: flapping or daily alerts are background. */
  alert_firing_frequency: boolean;
  /**
   * A low-cost model that reads a customer rule once to find the entity it watches, when the
   * rule's own definition does not say. Without it, such rules keep their name as their entity.
   */
  rule_entity_connector_id?: string;
}

/** Settings a person can change through the API; strategies merge field by field. */
export interface EngineConfigUpdate {
  strategies?: Partial<Record<SignalStrategyId, StrategyConfig>>;
  agent?: EngineConfig['agent'];
  baseline?: Partial<EngineConfig['baseline']>;
  join_window_minutes?: number;
  quiet_period_buckets?: number;
  worse_margin?: number;
  max_agent_calls_per_run?: number;
  max_agent_calls_per_day?: number;
  publish_to_alerting_v2?: boolean;
  learning?: {
    autonomy?: Partial<LearningConfig['autonomy']>;
    interval_minutes?: number;
    acceptance?: Partial<LearningConfig['acceptance']>;
    replay_hours?: number;
    max_model_calls_per_pass?: number;
  };
  triage?: Partial<TriageConfig>;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  strategies: {
    known_failure_queries: { mode: 'live', daily_cap: 10 },
    health_checks: { mode: 'live', daily_cap: 10 },
    customer_alerts: { mode: 'live', daily_cap: 20 },
    // The riskiest strategy starts as a trial, as the evolution path requires.
    new_log_patterns: { mode: 'trial', daily_cap: 5 },
    // Detectors the engine wrote. Each one runs as a trial until it proves itself, whatever
    // this mode says; `off` stops them all.
    learned_detectors: { mode: 'live', daily_cap: 5 },
    dependency_health: { mode: 'live', daily_cap: 10 },
    change_regressions: { mode: 'live', daily_cap: 5 },
  },
  agent: { kind: 'heuristic' },
  // 30 samples: with 10 the noise in the MAD alone raises the false-alarm rate about 20x.
  baseline: { min_samples: 30, history_buckets: 60, mad_k: 3, count_noise_k: 3 },
  join_window_minutes: 60,
  // Five quiet minutes before closing: Alertmanager resolves after 5 minutes, and a shorter
  // close splits an intermittent fault into several events.
  quiet_period_buckets: 5,
  worse_margin: 0.25,
  max_agent_calls_per_run: 8,
  max_agent_calls_per_day: 500,
  publish_to_alerting_v2: true,
  learning: {
    // Memory only informs the AI, so it acts; engine-owned changes wait for a person at first.
    autonomy: { memory: 'act', tuning: 'suggest', detectors: 'suggest' },
    interval_minutes: 5,
    acceptance: {
      max_warning_minutes: 10,
      max_false_opens_per_day: 2,
      min_trial_minutes: 30,
      rollback_dismissals: 2,
      watch_minutes: 24 * 60,
    },
    replay_hours: 24,
    max_model_calls_per_pass: 4,
  },
  triage: {
    event_search: true,
    source_scoped_dependencies: true,
    request_path_dependencies: true,
    evidence_named_joins: true,
    verifier_closes: true,
    regroup_recurrences: true,
    alert_firing_frequency: true,
  },
};
