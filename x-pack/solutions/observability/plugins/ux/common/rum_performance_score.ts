/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RumVitalRanks } from './rum_app';

/** Sentry-style log-normal curves: p10 ≈ score 90, p50 ≈ score 50. Used when ranks are missing. */
export const RUM_PERFORMANCE_VITALS = {
  lcp: { p10: 2500, p50: 4000, weight: 30 },
  inp: { p10: 200, p50: 500, weight: 30 },
  cls: { p10: 0.1, p50: 0.25, weight: 15 },
  fcp: { p10: 1800, p50: 3000, weight: 15 },
  ttfb: { p10: 800, p50: 1800, weight: 10 },
} as const;

export type RumPerformanceVital = keyof typeof RUM_PERFORMANCE_VITALS;

export type RumPerformanceScoreBand = 'success' | 'warning' | 'danger';

export interface RumPerformanceVitals {
  lcp?: number | null;
  inp?: number | null;
  cls?: number | null;
  fcp?: number | null;
  ttfb?: number | null;
  errorRate?: number | null;
  ranks?: Partial<Record<RumPerformanceVital, RumVitalRanks | null>>;
}

/** Abramowitz–Stegun 7.1.26; max error ~1.5e-7. */
const erf = (x: number): number => {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-abs * abs);
  return sign * y;
};

const standardNormalCdf = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));

/** Inverse CDF at 0.10 for the standard normal. */
const Z_P10 = 1.2815515655446004;

/** Score one vital 0–100 from a single percentile (higher is better). */
export const rumVitalScore = (value: number, p10: number, p50: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 100;
  }
  const mu = Math.log(p50);
  const sigma = (mu - Math.log(p10)) / Z_P10;
  if (!(sigma > 0)) {
    return value <= p50 ? 100 : 0;
  }
  const z = (Math.log(value) - mu) / sigma;
  const score = 100 * (1 - standardNormalCdf(z));
  return Math.min(100, Math.max(0, score));
};

/** Apdex: satisfied + half of tolerating, as 0–100. `good` / `ni` are percents. */
export const rumApdexFromRanks = (ranks: Pick<RumVitalRanks, 'good' | 'ni'>): number =>
  Math.min(100, Math.max(0, ranks.good + 0.5 * ranks.ni));

const clampRate = (rate: number): number => Math.min(1, Math.max(0, rate));

export type RumScoreVitalMethod = 'ranks' | 'p75';

export interface RumScoreVitalBreakdown {
  name: RumPerformanceVital;
  method: RumScoreVitalMethod;
  weight: number;
  /** Share of the Core Web Vitals average (0–1). */
  weightShare: number;
  score: number;
  p75: number | null;
  ranks: RumVitalRanks | null;
  /** Points this vital costs the CWV average vs a perfect 100. */
  drag: number;
}

export type RumScoreGap =
  | {
      kind: 'vital';
      name: RumPerformanceVital;
      drag: number;
      score: number;
      weightShare: number;
      method: RumScoreVitalMethod;
      ranks: RumVitalRanks | null;
      p75: number | null;
    }
  | {
      kind: 'error';
      errorRate: number;
      penalty: number;
      recoveredScore: number;
    };

export interface RumScoreBreakdown {
  score: number;
  /** Unrounded weighted vitals average, before the error multiplier. */
  cwvScore: number;
  errorRate: number | null;
  vitals: RumScoreVitalBreakdown[];
  missing: RumPerformanceVital[];
}

const PERFORMANCE_VITAL_NAMES = Object.keys(RUM_PERFORMANCE_VITALS) as RumPerformanceVital[];

/** Drop null rank entries so rows stay compact when histograms are missing. */
export const compactVitalRanks = (
  ranks: RumPerformanceVitals['ranks']
): RumPerformanceVitals['ranks'] => {
  if (!ranks) {
    return undefined;
  }
  const next: NonNullable<RumPerformanceVitals['ranks']> = {};
  PERFORMANCE_VITAL_NAMES.forEach((name) => {
    const value = ranks[name];
    if (value != null) {
      next[name] = value;
    }
  });
  return Object.keys(next).length > 0 ? next : undefined;
};

const scoreOneVital = (
  name: RumPerformanceVital,
  vitals: RumPerformanceVitals
): Pick<RumScoreVitalBreakdown, 'method' | 'score' | 'p75' | 'ranks'> | null => {
  const p75 = vitals[name];
  const p75Value = p75 != null && Number.isFinite(p75) ? p75 : null;
  const ranks = vitals.ranks?.[name];
  if (ranks != null) {
    return { method: 'ranks', score: rumApdexFromRanks(ranks), p75: p75Value, ranks };
  }
  if (p75Value == null) {
    return null;
  }
  const curve = RUM_PERFORMANCE_VITALS[name];
  return {
    method: 'p75',
    score: rumVitalScore(p75Value, curve.p10, curve.p50),
    p75: p75Value,
    ranks: null,
  };
};

/**
 * Weighted 0–100 score, with the inputs that produced it.
 * Prefers Apdex-from-ranks (good + ½ NI) when histograms exist; otherwise p75 log-normal.
 * Error sessions are frustrated (Apdex): they multiply the vitals score by 1 − errorRate.
 */
export const rumPerformanceScoreBreakdown = (
  vitals: RumPerformanceVitals
): RumScoreBreakdown | null => {
  const scored: Array<Omit<RumScoreVitalBreakdown, 'weightShare' | 'drag'>> = [];
  let weight = 0;
  PERFORMANCE_VITAL_NAMES.forEach((name) => {
    const detail = scoreOneVital(name, vitals);
    if (detail == null) {
      return;
    }
    const vitalWeight = RUM_PERFORMANCE_VITALS[name].weight;
    scored.push({ name, weight: vitalWeight, ...detail });
    weight += vitalWeight;
  });
  const errorRate =
    vitals.errorRate != null && Number.isFinite(vitals.errorRate)
      ? clampRate(vitals.errorRate)
      : null;
  const missing = PERFORMANCE_VITAL_NAMES.filter(
    (name) => !scored.some((vital) => vital.name === name)
  );
  if (weight === 0) {
    if (errorRate == null) {
      return null;
    }
    return {
      score: Math.round(100 * (1 - errorRate)),
      cwvScore: 100,
      errorRate,
      vitals: [],
      missing,
    };
  }
  const cwvScore = scored.reduce((sum, vital) => sum + vital.score * vital.weight, 0) / weight;
  return {
    score: Math.round(errorRate == null ? cwvScore : cwvScore * (1 - errorRate)),
    cwvScore,
    errorRate,
    vitals: scored.map((vital) => {
      const weightShare = vital.weight / weight;
      return {
        ...vital,
        weightShare,
        drag: (100 - vital.score) * weightShare,
      };
    }),
    missing,
  };
};

export const rumPerformanceScore = (vitals: RumPerformanceVitals): number | null =>
  rumPerformanceScoreBreakdown(vitals)?.score ?? null;

/** Gaps ordered by how much they pull the score down (vitals + errors). */
export const rumScoreGaps = (breakdown: RumScoreBreakdown): RumScoreGap[] => {
  const gaps: RumScoreGap[] = breakdown.vitals
    .filter((vital) => vital.drag >= 0.5)
    .map((vital) => ({
      kind: 'vital' as const,
      name: vital.name,
      drag: vital.drag,
      score: vital.score,
      weightShare: vital.weightShare,
      method: vital.method,
      ranks: vital.ranks,
      p75: vital.p75,
    }));
  if (breakdown.errorRate != null && breakdown.errorRate > 0) {
    const recoveredScore = Math.round(breakdown.cwvScore);
    const penalty = recoveredScore - breakdown.score;
    if (penalty >= 1) {
      gaps.push({
        kind: 'error',
        errorRate: breakdown.errorRate,
        penalty,
        recoveredScore,
      });
    }
  }
  return gaps.sort((left, right) => {
    const leftImpact = left.kind === 'error' ? left.penalty : left.drag;
    const rightImpact = right.kind === 'error' ? right.penalty : right.drag;
    return rightImpact - leftImpact;
  });
};

export const rumScoreStrengths = (breakdown: RumScoreBreakdown): RumScoreVitalBreakdown[] =>
  breakdown.vitals.filter((vital) => vital.score >= 90);

export const rumPerformanceScoreBand = (score: number): RumPerformanceScoreBand => {
  if (score >= 90) {
    return 'success';
  }
  if (score >= 50) {
    return 'warning';
  }
  return 'danger';
};
