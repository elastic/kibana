/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionStrategyId, StrategyMode } from './strategies';

/** Outcome of the baseline check. */
export type BaselineDecision = 'above_normal' | 'background' | 'warming_up' | 'skipped';

/** What the pipeline did with one detection. Every detection gets exactly one. */
export const DETECTION_OUTCOMES = [
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
] as const;
export type DetectionOutcome = (typeof DETECTION_OUTCOMES)[number];

/** Summary of the history the baseline check compared with. */
export interface BaselineSummary {
  decision: BaselineDecision;
  samples: number;
  /** Samples left out because an event for this series was open at the time. */
  excludedSamples: number;
  median?: number;
  mad?: number;
  threshold?: number;
}

/**
 * One evaluation of one series in one bucket, breaching or not. The baseline check needs the
 * non-breaching ones, which is why the engine keeps them and Alerting v2 does not.
 */
export interface EngineObservation {
  '@timestamp': string;
  run_id: string;
  strategy: DetectionStrategyId;
  fingerprint: string;
  service: string;
  bucket_start: string;
  value: number;
  looks_off: boolean;
  mode: 'live' | 'replay';
}

/**
 * The common detection format. Every strategy reports in this shape, and discovery reads only
 * this shape, so a new strategy plugs in without changing discovery.
 */
export interface EngineDetection {
  detection_id: string;
  '@timestamp': string;
  run_id: string;
  /** Which strategy found it. */
  strategy: DetectionStrategyId;
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
  outcome: DetectionOutcome;
  outcome_reason: string;
  event_id?: string;
}
