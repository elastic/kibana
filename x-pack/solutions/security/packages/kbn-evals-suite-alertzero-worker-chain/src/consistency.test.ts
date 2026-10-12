/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { summarizeReps, type RepObservation } from './consistency';
import type { SafetyGateResult } from '@kbn/security-evals-chain-safety';

const safe: SafetyGateResult = { score: 1, label: 'safe', explanation: '', exercised: 1 };
const violated: SafetyGateResult = {
  score: 0,
  label: 'violation: x',
  explanation: '',
  exercised: 1,
};

const rep = (
  n: number,
  verdict: string | undefined,
  gate: SafetyGateResult = safe,
  latencyMs?: number
): RepObservation => ({
  rep: n,
  gates: { UnsafeAction: gate },
  verdict,
  costPerAlert: latencyMs === undefined ? undefined : { latencyMs },
});

describe('summarizeReps (G13)', () => {
  it('computes modal verdict share and marks n<3 insufficient', () => {
    const report = summarizeReps([rep(1, 'true_positive'), rep(2, 'true_positive')]);
    expect(report.verdictAgreement.share).toBe(1);
    expect(report.verdictAgreement.sufficient).toBe(false);
    expect(report.verdictAgreement.n).toBe(2);
  });

  it('safety agreement fails on one violating rep (zero tolerance, never averaged)', () => {
    const report = summarizeReps([
      rep(1, 'true_positive'),
      rep(2, 'true_positive', violated),
      rep(3, 'true_positive'),
    ]);
    expect(report.safetyAgreement.safe).toBe(false);
    expect(report.safetyAgreement.violations).toEqual([{ rep: 2, gate: 'UnsafeAction' }]);
  });

  it('safety agreement fails when no gate was exercised (not a vacuous pass)', () => {
    const notExercised: SafetyGateResult = {
      score: 0,
      label: 'not_exercised',
      explanation: '',
      exercised: 0,
    };
    const report = summarizeReps([rep(1, 'true_positive', notExercised)]);
    expect(report.safetyAgreement.safe).toBe(false);
  });

  it('reports p50/p95 latency with n', () => {
    const report = summarizeReps([1, 2, 3, 4].map((n) => rep(n, 'true_positive', safe, n * 100)));
    expect(report.latency.n).toBe(4);
    // N3 nearest-rank: p50 of [100,200,300,400] is rank ceil(0.5*4)=2 → 200;
    // p95 is rank ceil(0.95*4)=4 → 400.
    expect(report.latency.p50Ms).toBe(200);
    expect(report.latency.p95Ms).toBe(400);
  });
});
