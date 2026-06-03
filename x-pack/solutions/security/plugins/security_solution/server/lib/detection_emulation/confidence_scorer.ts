/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmulationReportPhase } from './emulation_report_type';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ScoreConfidenceInput {
  /** Signal names expected by the scenario (from payload library). */
  expectedSignals: string[];
  /** Per-technique telemetry collected after dispatch. */
  perPhase: EmulationReportPhase[];
}

export interface ConfidenceScore {
  /** Weighted composite: coverage * 0.6 + precision * 0.4, rounded to 2dp, clamped [0,1]. */
  confidence: number;
  /** Fraction of expected signal names that fired: matchedSignals / expectedSignals. */
  coverage: number;
  /** Alert precision: TP / (TP + FP). */
  precision: number;
  /** Total true-positive alert count across all phases. */
  tp: number;
  /** Total false-positive alert count across all phases. */
  fp: number;
  /** Per-technique breakdown forwarded from the telemetry collector. */
  perPhase: EmulationReportPhase[];
  /** Machine-readable notes describing edge cases or degraded inputs. */
  caveats: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

const roundTo2dp = (v: number): number => Math.round(v * 100) / 100;

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Scores a completed emulation run.
 *
 * Formula:
 *   coverage   = matchedSignals / expectedSignals   (0 when expectedSignals is empty)
 *   precision  = TP / (TP + FP)                     (0 when no alerts observed)
 *   confidence = round(coverage * 0.6 + precision * 0.4, 2)  clamped [0, 1]
 *
 * `matchedSignals` is the count of distinct rule names in perPhase[].signals that
 * appear in expectedSignals — signal-name level, not alert-count level.
 */
export const scoreConfidence = (input: ScoreConfidenceInput): ConfidenceScore => {
  const { expectedSignals, perPhase } = input;
  const caveats: string[] = [];

  // Aggregate tp/fp counts and the set of rule names that fired.
  let tp = 0;
  let fp = 0;
  const firedSignals = new Set<string>();

  for (const phase of perPhase) {
    tp += phase.tp;
    fp += phase.fp;
    for (const signal of phase.signals) {
      firedSignals.add(signal);
    }
  }

  // Coverage: how many distinct expected signal names actually fired.
  let coverage: number;
  if (expectedSignals.length === 0) {
    coverage = 0;
    caveats.push('expected_signals_empty');
  } else {
    const expectedSet = new Set(expectedSignals);
    const matchedSignals = [...firedSignals].filter((s) => expectedSet.has(s)).length;
    coverage = matchedSignals / expectedSignals.length;
  }

  // Precision: fraction of observed alerts that were true positives.
  let precision: number;
  if (tp + fp === 0) {
    precision = 0;
    caveats.push('no_alerts_observed');
  } else {
    precision = tp / (tp + fp);
  }

  if (tp === 0 && fp > 0) {
    caveats.push('only_false_positives');
  }

  const confidence = clamp(roundTo2dp(coverage * 0.6 + precision * 0.4), 0, 1);

  return { confidence, coverage, precision, tp, fp, perPhase, caveats };
};
