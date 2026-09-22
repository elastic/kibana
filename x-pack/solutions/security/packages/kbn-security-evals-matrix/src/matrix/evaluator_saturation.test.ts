/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  detectSaturatedEvaluators,
  saturatedEvaluatorNames,
  DEFAULT_SATURATION_POLICY,
} from './evaluator_saturation';
import type { AggregatedModelScores } from './query_matrix_scores';

const model = (
  modelId: string,
  evaluators: Array<{ evaluatorName: string; mean: number; count?: number }>
): AggregatedModelScores => ({
  modelId,
  suites: [
    {
      suiteId: 'security-persona-matrix',
      experimentId: `exp-${modelId}`,
      datasets: [
        {
          datasetId: 'prefix:alert-analysis-a',
          datasetName: 'alert-analysis-a',
          evaluators: evaluators.map((e) => ({
            evaluatorName: e.evaluatorName,
            mean: e.mean,
            count: e.count ?? 10,
          })),
        },
      ],
    },
  ],
});

/** 12 models so the default minObservations (8) is satisfied. */
const buildModels = (valuesFor: (i: number) => Array<{ evaluatorName: string; mean: number }>) =>
  Array.from({ length: 12 }, (_, i) => model(`m${i}`, valuesFor(i)));

describe('detectSaturatedEvaluators', () => {
  it('flags an evaluator that returns the ceiling for every model', () => {
    const models = buildModels(() => [{ evaluatorName: 'FinalAnswerPresent', mean: 1 }]);

    const [result] = detectSaturatedEvaluators(models);

    expect(result.evaluatorName).toBe('FinalAnswerPresent');
    expect(result.saturated).toBe(true);
    expect(result.range).toBe(0);
    expect(result.distinctValues).toBe(1);
  });

  it('does not flag an evaluator that separates models', () => {
    const models = buildModels((i) => [{ evaluatorName: 'Factuality', mean: i / 11 }]);

    const [result] = detectSaturatedEvaluators(models);

    expect(result.saturated).toBe(false);
    expect(result.distinctValues).toBe(12);
  });

  it('treats an all-zero evaluator as failing, not saturated', () => {
    // All-zero is a broken evaluator, not saturation; excluding it would hide the breakage.
    const models = buildModels(() => [{ evaluatorName: 'PanelCountPreservation', mean: 0 }]);

    const [result] = detectSaturatedEvaluators(models);

    expect(result.saturated).toBe(false);
  });

  it('refuses a verdict below the observation floor', () => {
    const models = Array.from({ length: 3 }, (_, i) =>
      model(`m${i}`, [{ evaluatorName: 'Rubric', mean: 1 }])
    );

    const [result] = detectSaturatedEvaluators(models);

    expect(result.observations).toBe(3);
    expect(result.saturated).toBe(false);
  });

  it('normalizes by observed max so raw-magnitude evaluators are not judged against 1.0', () => {
    // Raw-magnitude evaluator identical across models is saturated even far from 1.0.
    const models = buildModels(() => [{ evaluatorName: 'Latency', mean: 70.4 }]);

    const [result] = detectSaturatedEvaluators(models);

    expect(result.saturated).toBe(true);
    expect(result.mean).toBe(1);
  });

  it('collapses multiple datasets to one observation per model', () => {
    // One model across several datasets counts once.
    const multi: AggregatedModelScores = {
      modelId: 'busy',
      suites: [
        {
          suiteId: 's',
          experimentId: 'e',
          datasets: ['a', 'b', 'c'].map((id) => ({
            datasetId: id,
            datasetName: id,
            evaluators: [{ evaluatorName: 'criteria', mean: 1, count: 10 }],
          })),
        },
      ],
    };

    const [result] = detectSaturatedEvaluators([multi]);

    expect(result.observations).toBe(1);
  });

  it('respects a stricter policy', () => {
    const models = buildModels((i) => [
      { evaluatorName: 'MinExpectedSteps', mean: i === 0 ? 0.8 : 1 },
    ]);

    expect(detectSaturatedEvaluators(models)[0].saturated).toBe(true);
    expect(
      detectSaturatedEvaluators(models, { ...DEFAULT_SATURATION_POLICY, maxRange: 0.1 })[0]
        .saturated
    ).toBe(false);
  });

  it('flags a high-but-never-maxed evaluator that still cannot rank', () => {
    // Clustered at 0.88-0.90 with no cell at 1.0 still ranks nothing.
    const models = buildModels((i) => [
      { evaluatorName: 'Groundedness', mean: 0.88 + (i % 3) * 0.01 },
    ]);

    const [result] = detectSaturatedEvaluators(models);

    expect(result.saturated).toBe(true);
    expect(result.range).toBeLessThan(0.05);
  });

  it('keeps a low-mean tightly-clustered evaluator in the aggregate', () => {
    // A tight cluster at a low mean is signal, not saturation.
    const models = buildModels(() => [{ evaluatorName: 'Factuality', mean: 0.35 }]);

    expect(detectSaturatedEvaluators(models)[0].saturated).toBe(false);
  });

  it('exposes saturated names as a set for filtering', () => {
    const models = buildModels((i) => [
      { evaluatorName: 'SkillInvoked', mean: 1 },
      { evaluatorName: 'Factuality', mean: i / 11 },
    ]);

    const names = saturatedEvaluatorNames(detectSaturatedEvaluators(models));

    expect(names.has('SkillInvoked')).toBe(true);
    expect(names.has('Factuality')).toBe(false);
  });
});
