/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Sentry-style log-normal curves: p10 ≈ score 90, p50 ≈ score 50. */
export const RUM_PERFORMANCE_VITALS = {
  lcp: { p10: 2500, p50: 4000, weight: 30 },
  inp: { p10: 200, p50: 500, weight: 30 },
  cls: { p10: 0.1, p50: 0.25, weight: 15 },
  fcp: { p10: 1800, p50: 3000, weight: 15 },
  ttfb: { p10: 800, p50: 1800, weight: 10 },
  errorRate: { p10: 0.01, p50: 0.05, weight: 20 },
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

/** Score one vital 0–100 (higher is better). */
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

/** Weighted 0–100 score; missing vitals drop out and weights renormalize. */
export const rumPerformanceScore = (vitals: RumPerformanceVitals): number | null => {
  let weighted = 0;
  let weight = 0;
  (Object.keys(RUM_PERFORMANCE_VITALS) as RumPerformanceVital[]).forEach((name) => {
    const value = vitals[name];
    if (value == null || !Number.isFinite(value)) {
      return;
    }
    const curve = RUM_PERFORMANCE_VITALS[name];
    weighted += rumVitalScore(value, curve.p10, curve.p50) * curve.weight;
    weight += curve.weight;
  });
  if (weight === 0) {
    return null;
  }
  return Math.round(weighted / weight);
};

export const rumPerformanceScoreBand = (score: number): RumPerformanceScoreBand => {
  if (score >= 90) {
    return 'success';
  }
  if (score >= 50) {
    return 'warning';
  }
  return 'danger';
};
