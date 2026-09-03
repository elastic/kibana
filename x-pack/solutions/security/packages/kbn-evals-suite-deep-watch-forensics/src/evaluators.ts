/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepWatchOutput } from './deep_watch_run';

export interface GateOutcome {
  id: string;
  expectedIncident: boolean;
  expectForensics: boolean;
  actualIncident: boolean;
  actualForensics: boolean;
}

/**
 * Per-row gate correctness: did the forensic step run exactly when it should
 * have? Scored separately from triage accuracy because a gate can be correct
 * while the verdict is wrong, and vice versa -- collapsing them hides which
 * half regressed.
 */
export const gateCorrectness = (outcome: GateOutcome): number =>
  outcome.actualForensics === outcome.expectForensics ? 1 : 0;

/** Per-row triage correctness against the golden label. */
export const triageCorrectness = (outcome: GateOutcome): number =>
  outcome.actualIncident === outcome.expectedIncident ? 1 : 0;

export interface DiscriminationReport {
  /** Rows whose ground truth says forensics must run. */
  positives: number;
  /** Rows whose ground truth says forensics must be skipped. */
  negatives: number;
  /** Positives where the gate correctly opened. */
  truePositives: number;
  /** Negatives where the gate correctly stayed shut. */
  trueNegatives: number;
  /**
   * True only when the gate was observed BOTH opening and closing correctly.
   * A suite that never exercises the closed path cannot distinguish a working
   * gate from one wired permanently open, so this is the headline metric.
   */
  discriminates: boolean;
  accuracy: number;
}

/**
 * Aggregate gate behavior across the run.
 *
 * `discriminates` is deliberately strict: it requires at least one correct
 * open AND one correct close. Reporting accuracy alone would let an
 * always-open gate score 1.0 on an all-positive dataset -- the exact false
 * green this suite exists to prevent.
 */
export const summarizeDiscrimination = (outcomes: GateOutcome[]): DiscriminationReport => {
  const positives = outcomes.filter((o) => o.expectForensics);
  const negatives = outcomes.filter((o) => !o.expectForensics);
  const truePositives = positives.filter((o) => o.actualForensics).length;
  const trueNegatives = negatives.filter((o) => !o.actualForensics).length;
  const correct = truePositives + trueNegatives;
  return {
    positives: positives.length,
    negatives: negatives.length,
    truePositives,
    trueNegatives,
    discriminates: truePositives > 0 && trueNegatives > 0,
    accuracy: outcomes.length === 0 ? 0 : correct / outcomes.length,
  };
};

/**
 * Output-contract validity. The workflow's `outputs` block only permits scalar
 * array elements, so an `iocs` array containing objects is a contract
 * violation that fails the run at `emit_result` -- worth grading explicitly
 * because unit tests asserting the wrong shape will not catch it.
 */
export const validOutputContract = (output: DeepWatchOutput): number => {
  if (output.iocs != null) {
    if (!Array.isArray(output.iocs)) {
      return 0;
    }
    if (output.iocs.some((entry) => typeof entry !== 'string')) {
      return 0;
    }
  }
  if (output.isIncident != null && typeof output.isIncident !== 'boolean') {
    return 0;
  }
  return 1;
};

/**
 * On a skipped-forensics run every forensic field must be at its documented
 * empty fallback. Catches a regression where a missing Liquid default renders
 * the literal template string instead of an empty value.
 */
export const cleanSkipFallbacks = (output: DeepWatchOutput): number => {
  const fields = [output.patientZero ?? '', output.attackTimeline ?? ''];
  // Checked BEFORE `didForensicsRun`: a leaked `{{ ... }}` expression is
  // non-empty text, so it reads as "forensics ran" and would otherwise
  // short-circuit this check into a pass -- the precise false green this
  // evaluator exists to catch.
  const leaked = fields.some((value) => value.includes('{{') || value.includes('steps.'));
  if (leaked) {
    return 0;
  }
  return 1;
};
