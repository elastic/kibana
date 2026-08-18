/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Exponent for the Riemann-zeta series that damps additional alerts:
 *   contribution_i = weight / i^ZETA_S_VALUE
 *
 * Mirrors RIEMANN_ZETA_S_VALUE = 1.5 from
 *   security_solution/server/lib/entity_analytics/risk_score/constants.ts
 * (cross-group import not allowed, so it is inlined here).
 */
const ZETA_S = 1.5;

/**
 * Uniform per-alert weight for the v1 (count-only) model.
 * With severity weighting, each alert gets its own w_i value; the formula stays the same.
 */
const ALERT_WEIGHT = 30;

/** Maximum number of alerts factored in. */
const MAX_ALERTS = 10;

// ---------------------------------------------------------------------------
// Level bands — higher score means healthier.
// ---------------------------------------------------------------------------

export type EntityHealthLevels = 'Unknown' | 'Critical' | 'Unhealthy' | 'Degraded' | 'Healthy';

export const HEALTH_LEVEL_RANGES: Record<EntityHealthLevels, { min: number; max: number }> = {
  Healthy: { min: 90, max: 100 },
  Degraded: { min: 60, max: 90 },
  Unhealthy: { min: 30, max: 60 },
  Critical: { min: 0, max: 30 },
  Unknown: { min: 0, max: 0 }, // sentinel — only returned when no signal is available
} as const;

export const getHealthLevel = (score: number): EntityHealthLevels => {
  if (score >= HEALTH_LEVEL_RANGES.Healthy.min) return 'Healthy';
  if (score >= HEALTH_LEVEL_RANGES.Degraded.min) return 'Degraded';
  if (score >= HEALTH_LEVEL_RANGES.Unhealthy.min) return 'Unhealthy';
  return 'Critical';
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Compute the internal degradation value from a list of alert weights (or a
 * plain count when all weights are equal). Range [0, 100].
 *
 * Uses a noisy-OR model so:
 *  - a single severe alert dominates
 *  - additional alerts add diminishing incremental degradation
 *  - the total is bounded and cannot reach 100 with uniform weights
 *
 * Formula: d = 100 * (1 - Π_{i=1..N} (1 - (w_i / 100) / i^ZETA_S))
 *
 * For the v1 count-only model, pass alertCount with no weights argument.
 */
export const computeDegradation = (alertCount: number, weights?: number[]): number => {
  const n = Math.min(alertCount, MAX_ALERTS);
  if (n === 0) return 0;

  // Sort descending (worst first) when individual weights are provided
  const sorted = weights ? [...weights].sort((a, b) => b - a).slice(0, n) : null;

  let survival = 1.0;
  for (let i = 1; i <= n; i++) {
    const w = sorted ? sorted[i - 1] ?? ALERT_WEIGHT : ALERT_WEIGHT;
    survival *= 1 - w / 100 / Math.pow(i, ZETA_S);
  }
  return 100 * (1 - survival);
};

/**
 * Calculate the 0–100 health score (higher = healthier) and its categorical
 * level from an alert count.
 *
 * Returns `null` when the alert signal was unavailable (e.g. permission error),
 * which the caller should map to `Unknown`.
 */
export const calculateHealthScore = (
  alertCount: number | null
): { score: number; level: EntityHealthLevels } | null => {
  if (alertCount === null) return null;

  const degradation = computeDegradation(alertCount);
  const score = Math.round((100 - degradation) * 100) / 100; // 2 decimal places
  return { score, level: getHealthLevel(score) };
};
