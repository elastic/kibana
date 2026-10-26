/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalStrategyId, StrategyMode } from './strategies';

/** Outcome of the baseline check. */
export type BaselineDecision = 'above_normal' | 'background' | 'warming_up' | 'skipped';

/** What the pipeline did with one signal. Every signal gets exactly one. */
export const SIGNAL_OUTCOMES = [
  'background',
  'warming_up',
  'trial_would_raise',
  'continued',
  'joined',
  'new_event',
  'reopened',
  'held_by_dismissal',
  'capped',
  'refuted',
  'deferred',
  'conflict',
  /** Above its trigger, but not yet in enough of the last minutes to be more than chance. */
  'unconfirmed',
  /** Supporting evidence only: it may join an open event, and opens none of its own. */
  'supporting',
] as const;
export type SignalOutcome = (typeof SIGNAL_OUTCOMES)[number];

/** Summary of the history the baseline check compared with. */
/** How often a customer alert fired, which the baseline check judges customer alerts by. */
export interface AlertFiringHistory {
  /** Kibana marked the alert as flapping. */
  flapping: boolean;
  /** Episodes of this rule and instance that started in the last hour, the current one included. */
  episodes_last_hour: number;
  /** Days of the last seven, today left out, on which it was active at some point. */
  days_active_last_week: number;
}

export interface BaselineSummary {
  decision: BaselineDecision;
  /** Why, in words, when the decision is not a comparison with a threshold. */
  reason?: string;
  /** For customer alerts: how often the alert fired. */
  firing?: AlertFiringHistory;
  samples: number;
  /** Samples left out because an event for this series was open at the time. */
  excludedSamples: number;
  median?: number;
  mad?: number;
  threshold?: number;
  /**
   * Set when the check compared on a log scale, as it does for latency, whose spread grows
   * with its level. `log_median` and `log_mad` are the values it compared with.
   */
  transform?: 'log';
  log_median?: number;
  log_mad?: number;
  /** For counts: variance over mean of the history, which widens the floor for bursty series. */
  dispersion?: number;
}

/**
 * One evaluation of one series in one bucket, breaching or not. The baseline check needs the
 * non-breaching ones, which is why the engine keeps them and Alerting v2 does not.
 */
export interface EngineObservation {
  '@timestamp': string;
  run_id: string;
  strategy: SignalStrategyId;
  fingerprint: string;
  service: string;
  bucket_start: string;
  value: number;
  looks_off: boolean;
  mode: 'live' | 'replay';
}

/**
 * The common signal format. Every strategy reports in this shape, and triage reads only
 * this shape, so a new strategy plugs in without changing triage.
 */
export interface EngineSignal {
  signal_id: string;
  '@timestamp': string;
  run_id: string;
  /** Which strategy found it. */
  strategy: SignalStrategyId;
  /** The strategy's mode when it reported. */
  mode: StrategyMode;
  /** Stable identity of the watched series; the same problem always has the same fingerprint. */
  fingerprint: string;
  /** Which service. */
  service: string;
  /** What looks off, in words. */
  title: string;
  description: string;
  /** Since when: the start of the bucket it was found in, or the alert start. */
  since: string;
  bucket_start: string;
  bucket_end: string;
  value: number;
  unit: string;
  /** How important, 0-100, as the strategy rates it. */
  importance: number;
  /** How to check it: a query anyone can re-run to see the evidence. */
  evidence_esql: string;
  source_id?: string;
  /** The Alerting v2 rule that produced the evaluation, for rule-backed strategies. */
  rule_id?: string;
  baseline: BaselineSummary;
  outcome: SignalOutcome;
  outcome_reason: string;
  event_id?: string;
}
