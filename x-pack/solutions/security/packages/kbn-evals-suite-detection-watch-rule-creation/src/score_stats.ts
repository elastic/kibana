/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure score statistics. A mean without a confidence interval invites
 * over-reading: at n=3 examples x 3 reps, one example flipping moves a dataset
 * mean by 0.33. Every reported number here carries its own resolution limit.
 */

export interface ScoreStats {
  n: number;
  mean: number;
  std: number;
  /** Half-width of the 95% CI on the mean (normal approximation). */
  ci95: number;
  /** true when every observed score is identical AND at an extreme — the
   *  evaluator contributed no discriminating signal in this run. */
  saturated: boolean;
  naCount: number;
}

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
  const ci95 = n > 1 ? (1.96 * std) / Math.sqrt(n) : 0;
  const allSame = scored.every((s) => s === scored[0]);
  const atExtreme = scored[0] === 0 || scored[0] === 1;
  return { n, mean, std, ci95, saturated: allSame && atExtreme, naCount };
};

/**
 * Two arms are distinguishable only when their CI bands do not overlap. With
 * small n this correctly reports "no difference" for deltas that eyeballing a
 * means table would call a regression or an improvement.
 */
export const areDistinguishable = (
  a: ScoreStats,
  b: ScoreStats
): { distinguishable: boolean; note: string } => {
  if (a.n === 0 || b.n === 0) {
    return { distinguishable: false, note: 'one arm has no scored examples' };
  }
  const gap = Math.abs(a.mean - b.mean);
  const band = a.ci95 + b.ci95;
  if (gap > band) {
    return {
      distinguishable: true,
      note: `delta ${gap.toFixed(3)} exceeds combined CI ${band.toFixed(3)}`,
    };
  }
  return {
    distinguishable: false,
    note: `delta ${gap.toFixed(3)} within combined CI ${band.toFixed(
      3
    )} — not resolvable at this n`,
  };
};

/**
 * Paired per-example delta: for each example scored in both arms, the score
 * difference removes example difficulty as a variance source. Typically halves
 * the n needed versus comparing dataset means.
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
  return { deltas, pairedIds, skippedIds };
};
