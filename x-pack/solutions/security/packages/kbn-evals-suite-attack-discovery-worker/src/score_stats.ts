/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ScoreStats {
  n: number;
  mean: number;
  std: number;
  /** Half-width of the two-sided 95% CI on the mean, using Student's t for n-1 degrees of freedom. */
  ci95: number;
  /** true when every observed score is identical AND at an extreme — the
   *  evaluator contributed no discriminating signal in this run. */
  saturated: boolean;
  naCount: number;
}

// Two-sided 95% critical values of Student's t for 1..30 degrees of freedom.
// The normal 1.96 understates the band at the small n these evals run at
// (at n=3 the true multiplier is 4.30), which would over-report "distinguishable".
const T_CRITICAL_95 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145,
  2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048,
  2.045, 2.042,
];
const NORMAL_CRITICAL_95 = 1.96;

const tCritical95 = (degreesOfFreedom: number): number =>
  T_CRITICAL_95[degreesOfFreedom - 1] ?? NORMAL_CRITICAL_95;

export const computeScoreStats = (scores: Array<number | null>): ScoreStats => {
  const scored = scores.filter((s): s is number => s != null);
  const n = scored.length;
  const naCount = scores.length - n;
  if (n === 0) {
    return { n: 0, mean: NaN, std: NaN, ci95: NaN, saturated: false, naCount };
  }
  const mean = scored.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? scored.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const std = Math.sqrt(variance);
  const ci95 = n > 1 ? (tCritical95(n - 1) * std) / Math.sqrt(n) : 0;
  const allSame = scored.every((s) => s === scored[0]);
  const atExtreme = scored[0] === 0 || scored[0] === 1;
  return { n, mean, std, ci95, saturated: allSame && atExtreme, naCount };
};

/**
 * Fewest scored examples per arm before a CI band means anything. At n=1 the
 * sample variance is undefined and `ci95` is 0, so a single 0-vs-1 pair would
 * read as a clean separation; at n=2 the band rests on one degree of freedom.
 */
export const MIN_DISTINGUISHABLE_N = 3;

export type DistinguishabilityVerdict = 'distinguishable' | 'not_distinguishable' | 'indeterminate';

/**
 * Two arms are distinguishable only when their CI bands do not overlap. With
 * small n this correctly reports "no difference" for deltas that eyeballing a
 * means table would call a regression or an improvement, and below
 * {@link MIN_DISTINGUISHABLE_N} it returns no verdict at all rather than one
 * built on a band that cannot be estimated.
 */
export const areDistinguishable = (
  a: ScoreStats,
  b: ScoreStats
): { verdict: DistinguishabilityVerdict; note: string } => {
  if (a.n < MIN_DISTINGUISHABLE_N || b.n < MIN_DISTINGUISHABLE_N) {
    return {
      verdict: 'indeterminate',
      note: `n=${a.n} vs n=${b.n}: fewer than ${MIN_DISTINGUISHABLE_N} scored examples on one arm, so no CI band can be estimated`,
    };
  }
  const gap = Math.abs(a.mean - b.mean);
  const band = a.ci95 + b.ci95;
  if (gap > band) {
    return {
      verdict: 'distinguishable',
      note: `delta ${gap.toFixed(3)} exceeds combined CI ${band.toFixed(3)}`,
    };
  }
  return {
    verdict: 'not_distinguishable',
    note: `delta ${gap.toFixed(3)} within combined CI ${band.toFixed(3)}, not resolvable at this n`,
  };
};

/**
 * Paired per-example delta: for each example scored in both arms, the score
 * difference removes example difficulty as a variance source.
 */
export const pairedDeltas = (
  aByExample: Map<string, number | null>,
  bByExample: Map<string, number | null>
): { deltas: number[]; pairedIds: string[]; skippedIds: string[] } => {
  const deltas: number[] = [];
  const pairedIds: string[] = [];
  const skippedIds: string[] = [];
  for (const [id, aScore] of aByExample) {
    const bScore = bByExample.get(id);
    if (aScore == null || bScore == null) {
      skippedIds.push(id);
    } else {
      deltas.push(aScore - bScore);
      pairedIds.push(id);
    }
  }
  // An example only arm b scored is just as unpaired as one only arm a scored.
  for (const id of bByExample.keys()) {
    if (!aByExample.has(id)) skippedIds.push(id);
  }
  return { deltas, pairedIds, skippedIds };
};
