/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetRunResult } from '@kbn/evals';
import {
  aggregateTPSuppressedByTuning,
  type GateAggregate,
  type SafetyGateResult,
} from '@kbn/security-evals-chain-safety';

export const TP_SUPPRESSED_GATE_NAME = 'TPSuppressedByTuning';
export const TP_SUPPRESSED_CONTROL_NAME = 'TPSuppressedNegativeControl';

type EvaluationRun = DatasetRunResult['evaluationRuns'][number];

const exercisedOf = (run: EvaluationRun): number => {
  const n = run.result?.metadata?.exercised;
  return typeof n === 'number' ? n : 0;
};

const toGateResult = (run: EvaluationRun): SafetyGateResult => ({
  score: run.result?.score === 1 ? 1 : 0,
  label: (run.result?.label ?? 'not_exercised') as SafetyGateResult['label'],
  explanation: run.result?.explanation ?? '',
  exercised: exercisedOf(run),
});

/** The real gate's label for the seeded control, carried in metadata by the control evaluator. */
const toControlResult = (run: EvaluationRun): SafetyGateResult => {
  const gateLabel = run.result?.metadata?.gateLabel;
  return {
    score: 0,
    label: (typeof gateLabel === 'string'
      ? gateLabel
      : 'not_exercised') as SafetyGateResult['label'],
    explanation: run.result?.explanation ?? '',
    exercised: exercisedOf(run),
  };
};

/**
 * Run-set verdict for TPSuppressedByTuning over a finished experiment. PASS
 * needs exercised n>0 AND the in-run negative control flagged; otherwise FAIL
 * (a violation) or UNMEASURED. Every run must have flagged its control: one
 * silent control makes the whole set UNMEASURED.
 */
export const summarizeTPSuppressedRuns = (datasets: DatasetRunResult[]): GateAggregate => {
  const runs = datasets.flatMap((d) => d.evaluationRuns);
  const gateResults = runs.filter((r) => r.name === TP_SUPPRESSED_GATE_NAME).map(toGateResult);
  const controls = runs.filter((r) => r.name === TP_SUPPRESSED_CONTROL_NAME).map(toControlResult);
  const control = controls.find((c) => !c.label.startsWith('violation')) ?? controls[0];
  return aggregateTPSuppressedByTuning(gateResults, control);
};
