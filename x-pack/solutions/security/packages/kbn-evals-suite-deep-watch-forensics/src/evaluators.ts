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
  actualIncident: boolean;
  /**
   * The workflow's own observable outcome: `assessed`, `no_host_resolved`, or
   * `agent_no_structured_output`. Only `assessed` rows carry a real verdict.
   */
  gate: string;
}

/** A row is a scoreable verdict only when the watch actually assessed it. */
export const isAssessed = (outcome: GateOutcome): boolean => outcome.gate === 'assessed';

/**
 * Per-row verdict correctness against the golden label.
 *
 * This replaced `gateCorrectness`, which asked "did the forensic step run when
 * it should have?". Under the telemetry-first architecture the forensic agent
 * runs on every row by design, so that question no longer distinguishes
 * anything -- the verdict IS the gate. A detector that cannot be false is not a
 * measurement.
 */
export const verdictCorrectness = (outcome: GateOutcome): number =>
  isAssessed(outcome) && outcome.actualIncident === outcome.expectedIncident ? 1 : 0;

/** Per-row triage correctness against the golden label. */
export const triageCorrectness = (outcome: GateOutcome): number =>
  outcome.actualIncident === outcome.expectedIncident ? 1 : 0;

export interface DiscriminationReport {
  /** Rows whose ground truth says this is an incident. */
  positives: number;
  /** Rows whose ground truth says this is benign. */
  negatives: number;
  /** Positives the watch correctly opened (isIncident true). */
  truePositives: number;
  /** Negatives the watch correctly closed (isIncident false). */
  trueNegatives: number;
  /**
   * Rows that never produced a verdict (harness errors). Excluded from
   * true-positive/negative counts so a broken run can never be scored as a
   * correct close, and surfaced so it cannot be silently ignored.
   */
  harnessErrors: number;
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
  // Only assessed rows carry a verdict. A row that failed to produce structured
  // output is a harness error: counting it as "not an incident" would let a
  // broken agent masquerade as a correct close -- the exact false green this
  // suite exists to prevent.
  const assessed = outcomes.filter(isAssessed);
  const harnessErrors = outcomes.length - assessed.length;
  const positives = assessed.filter((o) => o.expectedIncident);
  const negatives = assessed.filter((o) => !o.expectedIncident);
  const truePositives = positives.filter((o) => o.actualIncident).length;
  const trueNegatives = negatives.filter((o) => !o.actualIncident).length;
  const correct = truePositives + trueNegatives;
  return {
    positives: positives.length,
    negatives: negatives.length,
    truePositives,
    trueNegatives,
    harnessErrors,
    discriminates: truePositives > 0 && trueNegatives > 0 && harnessErrors === 0,
    // Accuracy is over ALL rows, not just assessed ones: dividing by the
    // survivors would inflate the score exactly when the harness is failing.
    accuracy: outcomes.length === 0 ? 0 : correct / outcomes.length,
  };
};

/**
 * Output-contract validity: an emitted verdict must carry the fields it claims
 * to have assessed, and `agent_no_structured_output` is never a contract pass.
 */
export const validOutputContract = (output: DeepWatchOutput): number => {
  if (output.recommendedActions != null) {
    if (!Array.isArray(output.recommendedActions)) {
      return 0;
    }
  }
  if (output.isIncident != null && typeof output.isIncident !== 'boolean') {
    return 0;
  }
  // v21: an assessed verdict must carry the fields it claims to have assessed.
  // An empty rationale on gate=assessed means the agent run ended without a
  // structured output and the defaults masked it — a harness error, not a pass.
  if ((output as { gate?: string }).gate === 'assessed') {
    if (typeof output.isIncident !== 'boolean') {
      return 0;
    }
    if (typeof output.rationale !== 'string' || output.rationale.trim() === '') {
      return 0;
    }
  }
  if ((output as { gate?: string }).gate === 'agent_no_structured_output') {
    // Surfaced distinctly by v21: never a contract pass.
    return 0;
  }
  return 1;
};

/**
 * Liquid-leak guard. The emitted narrative fields are built from
 * `{{ ... | default: ... }}` chains; a malformed chain renders the literal
 * template text instead of a value. That leaked text is non-empty, so it reads
 * as a populated field and would otherwise pass every other check.
 */
export const cleanSkipFallbacks = (output: DeepWatchOutput): number => {
  const fields = [output.rationale ?? '', output.proposal ?? ''];
  const leaked = fields.some((value) => value.includes('{{') || value.includes('steps.'));
  return leaked ? 0 : 1;
};
