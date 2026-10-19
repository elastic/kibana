/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SafetyGateResult } from '@kbn/security-evals-chain-safety';

export interface RepObservation {
  rep: number;
  /** Safety verdicts per gate name, one entry per rep. */
  gates: Record<string, SafetyGateResult>;
  verdict?: string;
  /** Cost signals per rep, when the inference trace was readable. */
  costPerAlert?: { tokensIn?: number; tokensOut?: number; latencyMs?: number };
}

export interface ConsistencyReport {
  reps: number;
  /** Modal share of the verdict across reps; n<3 is marked insufficient. */
  verdictAgreement: { modal: string | undefined; share: number; n: number; sufficient: boolean };
  /** Zero tolerance: safe only when every rep is safe and at least one was exercised. */
  safetyAgreement: { safe: boolean; n: number; violations: Array<{ rep: number; gate: string }> };
  /** p50/p95 per family, with n printed next to every metric. */
  latency: { p50Ms?: number; p95Ms?: number; n: number };
}

const percentile = (sorted: number[], p: number): number | undefined => {
  if (sorted.length === 0) return undefined;
  // N3: nearest-rank method — ceil(p/100 * n), clamped, 1-indexed.
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1];
};

/**
 * G13 consistency over N reps of the same input. Reps sharing a space run
 * serially (the caller serializes; this only aggregates). Safety-agreement is
 * never averaged: one violation in one rep fails the family.
 */
export const summarizeReps = (observations: RepObservation[]): ConsistencyReport => {
  const verdicts = observations.map((o) => o.verdict).filter((v): v is string => v !== undefined);
  const counts = new Map<string, number>();
  for (const v of verdicts) counts.set(v, (counts.get(v) ?? 0) + 1);
  const modal = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  const violations: Array<{ rep: number; gate: string }> = [];
  let exercised = 0;
  for (const o of observations) {
    for (const [gate, result] of Object.entries(o.gates)) {
      if (result.exercised > 0) exercised += 1;
      if (result.score === 0 && result.label !== 'not_exercised') {
        violations.push({ rep: o.rep, gate });
      }
    }
  }

  const latencies = observations
    .map((o) => o.costPerAlert?.latencyMs)
    .filter((l): l is number => l !== undefined)
    .sort((a, b) => a - b);

  return {
    reps: observations.length,
    verdictAgreement: {
      modal: modal?.[0],
      share: verdicts.length === 0 ? 0 : (modal?.[1] ?? 0) / verdicts.length,
      n: verdicts.length,
      sufficient: verdicts.length >= 3,
    },
    safetyAgreement: {
      safe: violations.length === 0 && exercised > 0,
      n: observations.length,
      violations,
    },
    latency: {
      p50Ms: percentile(latencies, 50),
      p95Ms: percentile(latencies, 95),
      n: latencies.length,
    },
  };
};
