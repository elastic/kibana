/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregatedModelScores } from './query_matrix_scores';

/** Ranking power of one evaluator across models; a saturated evaluator scores every model alike. */
export interface EvaluatorSaturation {
  evaluatorName: string;
  /** Mean across models, normalized by the observed maximum (0-1). */
  mean: number;
  /** Population stdev of the normalized model means -- the ranking signal. */
  stdev: number;
  /** max - min of the normalized model means. */
  range: number;
  /** Distinct model-level means observed -- 1 means literally no discrimination. */
  distinctValues: number;
  /** Number of model-level observations backing the verdict. */
  observations: number;
  saturated: boolean;
}

export interface SaturationPolicy {
  /** Minimum normalized mean to qualify: only high scorers can be "at ceiling". */
  minMean: number;
  /** Maximum normalized spread (max-min) to qualify as non-discriminating. */
  maxRange: number;
  /** Below this many observations the verdict is not trustworthy. */
  minObservations: number;
}

export const DEFAULT_SATURATION_POLICY: SaturationPolicy = {
  minMean: 0.85,
  maxRange: 0.25,
  minObservations: 8,
};

const EPSILON = 1e-9;

/** Collects one weighted mean per model for each evaluator, so dataset coverage cannot outvote models. */
const collectByEvaluator = (models: readonly AggregatedModelScores[]): Map<string, number[]> => {
  const byEvaluator = new Map<string, number[]>();
  for (const model of models) {
    const perModel = new Map<string, { weightedSum: number; weight: number }>();
    for (const suite of model.suites ?? []) {
      for (const dataset of suite.datasets ?? []) {
        for (const evaluator of dataset.evaluators ?? []) {
          if (Number.isFinite(evaluator.mean)) {
            const weight = evaluator.count > 0 ? evaluator.count : 1;
            const acc = perModel.get(evaluator.evaluatorName) ?? { weightedSum: 0, weight: 0 };
            acc.weightedSum += evaluator.mean * weight;
            acc.weight += weight;
            perModel.set(evaluator.evaluatorName, acc);
          }
        }
      }
    }
    for (const [evaluatorName, acc] of perModel) {
      if (acc.weight !== 0) {
        const bucket = byEvaluator.get(evaluatorName);
        if (bucket) {
          bucket.push(acc.weightedSum / acc.weight);
        } else {
          byEvaluator.set(evaluatorName, [acc.weightedSum / acc.weight]);
        }
      }
    }
  }
  return byEvaluator;
};

/** Classifies each evaluator as saturated (high mean, narrow spread across models) or discriminating. */
export const detectSaturatedEvaluators = (
  models: readonly AggregatedModelScores[],
  policy: SaturationPolicy = DEFAULT_SATURATION_POLICY
): EvaluatorSaturation[] => {
  const results: EvaluatorSaturation[] = [];

  for (const [evaluatorName, entries] of collectByEvaluator(models)) {
    const values = entries.filter((v) => Number.isFinite(v));
    if (values.length > 0) {
      const max = Math.max(...values);
      const observations = values.length;
      // 0-1 evaluators keep a fixed ceiling so a uniformly low score is not rescaled to 1; only raw magnitudes use their max.
      const scaleBase = Math.max(1, max);
      const normalized = values.map((v) => v / scaleBase);
      const mean = normalized.reduce((sum, v) => sum + v, 0) / observations;
      const variance = normalized.reduce((sum, v) => sum + (v - mean) ** 2, 0) / observations;
      const stdev = Math.sqrt(variance);
      const range = Math.max(...normalized) - Math.min(...normalized);
      const distinctValues = new Set(values.map((v) => v.toFixed(6))).size;

      const saturated =
        max > EPSILON &&
        observations >= policy.minObservations &&
        mean >= policy.minMean &&
        range <= policy.maxRange;

      results.push({
        evaluatorName,
        mean,
        stdev,
        range,
        distinctValues,
        observations,
        saturated,
      });
    }
  }

  return results.sort((a, b) => b.mean - a.mean || a.evaluatorName.localeCompare(b.evaluatorName));
};

/** Names of evaluators the policy judges saturated. */
export const saturatedEvaluatorNames = (saturation: readonly EvaluatorSaturation[]): Set<string> =>
  new Set(saturation.filter((entry) => entry.saturated).map((entry) => entry.evaluatorName));
