/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Ids of the signal strategies the engine ships. */
export const SIGNAL_STRATEGY_IDS = [
  'known_failure_queries',
  'health_checks',
  'customer_alerts',
  'new_log_patterns',
  'learned_detectors',
  'dependency_health',
  'change_regressions',
] as const;
export type SignalStrategyId = (typeof SIGNAL_STRATEGY_IDS)[number];

/** Off runs nothing; trial records what it would raise without raising; live raises events. */
export const STRATEGY_MODES = ['off', 'trial', 'live'] as const;
export type StrategyMode = (typeof STRATEGY_MODES)[number];

/** How a strategy's signals go through the baseline check. */
export type BaselinePolicy =
  /** Compare with the series' own stored history. */
  | 'own_history'
  /** The signal is new by definition, so its history counts as zero. */
  | 'implicit_zero'
  /** The customer's own rule already decided; the check is skipped. */
  | 'skip'
  /**
   * The customer's own rule already decided the value is off, so the check asks how often the
   * alert fires instead: an alert that flaps or fires every day is background.
   */
  | 'firing_frequency';

/**
 * Where a strategy runs. Rule-backed strategies are Alerting v2 signal rules that the platform
 * schedules, retries and runs with an API key; the engine only reads what they wrote. Direct
 * strategies are read by the engine itself, because their data never reaches `.rule-events`.
 */
export type StrategyRunner = 'alerting_v2_rule' | 'direct';

/** Static description of a strategy, shown in the UI. */
export interface SignalStrategyDescriptor {
  id: SignalStrategyId;
  name: string;
  /** What it watches. */
  watches: string;
  /** When it reports a signal. */
  reportsWhen: string;
  baselinePolicy: BaselinePolicy;
  runner: StrategyRunner;
  /**
   * True when the strategy reports only series that look off. A missing series then means
   * healthy; for other strategies it means "not evaluated", which never proves recovery.
   */
  reportsOnlyFiring: boolean;
  /** Replay can run it over past buckets. Customer alerts only exist in the present. */
  supportsReplay: boolean;
  /**
   * How long after a bucket ends its data is complete. Rule-backed strategies wait for their
   * rule's next run; the engine never evaluates a bucket before then.
   */
  settleMs: number;
  /**
   * How long after a minute ends its rule output can be trusted. A minute evaluated later than
   * this, such as while catching up after an outage, is evaluated with the strategy's direct
   * query instead: the rule may not have run while the platform was down.
   */
  liveWindowMs?: number;
  /**
   * True when every run of the strategy's rule writes rows, as long as its source has data. A
   * minute is then settled as soon as each rule has run after it, instead of after `settleMs`.
   */
  writesEveryRun?: boolean;
  /**
   * How many of the last few evaluations of a series must look off before it reaches triage,
   * when it holds no open event. One noisy minute is rarely a problem: two of three cuts chance
   * triggers by one to two orders of magnitude for one extra minute of delay. A series already
   * in an open event, or one the strategy marks as confirmed, skips this.
   */
  confirmation?: { need: number; of: number };
}

/** Per-strategy engine settings. */
export interface StrategyConfig {
  mode: StrategyMode;
  /** Most new events this strategy may open per UTC day. Joins and repeats are not charged. */
  daily_cap: number;
}

/** A change the learning loop proposes; a person accepts or ignores it. */
export interface StrategyProposal {
  id: string;
  strategy: SignalStrategyId;
  change: { mode: StrategyMode };
  title: string;
  evidence: string;
}

/** How a strategy has performed, from recorded outcomes and labelled incidents. */
export interface StrategyScorecard {
  strategy: SignalStrategyId;
  signals: number;
  above_normal: number;
  would_raise_in_trial: number;
  events_opened: number;
  events_dismissed: number;
  verifier_failures: number;
  /** Confirmed incidents an event of this strategy held. */
  incidents_caught: number;
  /** Missed incidents on services this strategy watches. */
  incidents_missed: number;
  /** Median minutes from a confirmed incident's start to the event, when known. */
  median_warning_minutes?: number;
  /** The reward the learning loop ranks strategies by; see `scoreStrategies`. */
  score: number;
}

/** The Alerting v2 rules one strategy runs on, as last reconciled. */
export interface StrategyRulesState {
  strategy: SignalStrategyId;
  /** Rules the engine owns for this strategy. Zero for strategies that read other rules. */
  owned_rules: number;
  /** Rules this strategy reads, owned or not (the known failure query rules are owned by Significant Events). */
  watched_rules: number;
  /** Sources skipped because they lack a field the strategy needs, with the reason. */
  skipped_sources: Array<{ source_id: string; reason: string }>;
  errors: string[];
}

/** Outcome of the last reconciliation of the engine's Alerting v2 rules in a space. */
export interface EngineRulesState {
  reconciled_at?: string;
  /** Hash of the inputs the rules were built from; a change triggers a new reconciliation. */
  inputs_hash?: string;
  created: number;
  deleted: number;
  strategies: StrategyRulesState[];
  error?: string;
}
