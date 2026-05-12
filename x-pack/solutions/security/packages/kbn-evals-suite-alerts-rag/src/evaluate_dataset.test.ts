/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertsRagEvaluators, toDatasetExample } from './evaluate_dataset';
import type { AlertsRagExample } from './dataset';

describe('buildAlertsRagEvaluators', () => {
  // The evaluator set is load-bearing for the regression story: each name
  // here is a column in the Buildkite eval report. A silent drop or rename
  // would skip regression coverage without changing the suite's exit code,
  // so this test pins the expected names against the framework primitives.
  const expectedNames = [
    // Quantitative correctness — deterministic scores from the precomputed
    // CorrectnessAnalysis attached by the task function. Provided by
    // `createQuantitativeCorrectnessEvaluators` from @kbn/evals.
    'Factuality',
    'Relevance',
    'Sequence Accuracy',
    // Quantitative groundedness — deterministic score from the precomputed
    // GroundednessAnalysis. Provided by `createQuantitativeGroundednessEvaluator`.
    'Groundedness',
  ];

  it('returns the canonical evaluator set in a stable order', () => {
    const evaluators = buildAlertsRagEvaluators();
    const names = evaluators.map((e) => e.name);
    expect(names).toEqual(expectedNames);
  });

  it('returns only framework-native evaluators (no custom Faithfulness/AnswerCorrectness)', () => {
    const evaluators = buildAlertsRagEvaluators();
    const names = evaluators.map((e) => e.name);
    expect(names).not.toContain('Faithfulness');
    expect(names).not.toContain('AnswerCorrectness');
  });
});

describe('toDatasetExample', () => {
  const fixture: AlertsRagExample = {
    langsmithExampleId: 'ls-1',
    input: 'what hosts are affected?',
    expected: { reference: 'SRVMAC08, SRVMAC09' },
    metadata: { category: 'field_specific_lookup', dataset_split: ['regression'] },
  };

  it('mirrors reference into output.expected so framework correctnessAnalysis reads it', () => {
    // The framework's `createCorrectnessAnalysisEvaluator` reads
    // `expected?.expected`. Without mirroring `reference -> expected`, the
    // judge receives `undefined` for the ground-truth answer and silently
    // scores the response as unevaluable. This assertion locks that contract.
    const wrapped = toDatasetExample(fixture);
    expect(wrapped.output).toEqual({
      reference: 'SRVMAC08, SRVMAC09',
      expected: 'SRVMAC08, SRVMAC09',
    });
  });

  it('wraps the question into the framework Input shape', () => {
    const wrapped = toDatasetExample(fixture);
    expect(wrapped.input).toEqual({ question: 'what hosts are affected?' });
  });

  it('forwards metadata for the framework-side report grouping', () => {
    const wrapped = toDatasetExample(fixture);
    expect(wrapped.metadata).toEqual({
      category: 'field_specific_lookup',
      dataset_split: ['regression'],
      langsmithExampleId: 'ls-1',
    });
  });
});
