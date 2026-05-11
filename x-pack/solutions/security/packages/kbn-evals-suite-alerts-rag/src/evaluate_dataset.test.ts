/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertsRagEvaluators, toDatasetExample } from './evaluate_dataset';
import type { AlertsRagExample } from './dataset';

describe('buildAlertsRagEvaluators', () => {
  // The evaluator set is load-bearing for the parity story: each name in this
  // list corresponds to a column in the Buildkite eval report and to a row in
  // `docs/parity-verification.md`. A silent drop or rename here would skip
  // regression coverage without changing the suite's exit code, so we pin the
  // expected names against the framework primitives.
  // The framework parameterises RAG evaluator names with the literal K value
  // (`Precision@10`, not `Precision@K`), so the expected list is parameterised
  // by `k` to keep this assertion useful when the suite is run with a non-
  // default `ALERTS_RAG_EVAL_K`.
  const expectedNames = (k: number) => [
    // RAG retrieval signals — load-bearing for alerts-RAG since alert-ID
    // overlap is the closest analog to LangSmith's relevance scoring.
    `Precision@${k}`,
    `Recall@${k}`,
    `F1@${k}`,
    // Quantitative correctness — deterministic scores from the precomputed
    // CorrectnessAnalysis attached by the task function. Provided by
    // `createQuantitativeCorrectnessEvaluators` from @kbn/evals.
    'Factuality',
    'Relevance',
    'Sequence Accuracy',
    // Quantitative groundedness — deterministic score from the precomputed
    // GroundednessAnalysis. Provided by `createQuantitativeGroundednessEvaluator`
    // from @kbn/evals. Replaces the deleted custom Faithfulness evaluator.
    'Groundedness',
  ];

  it('returns the canonical evaluator set in a stable order with default k=10', () => {
    const evaluators = buildAlertsRagEvaluators({ k: 10 });
    const names = evaluators.map((e) => e.name);
    expect(names).toEqual(expectedNames(10));
  });

  it('parameterises RAG evaluator names with the actual k value', () => {
    const evaluators = buildAlertsRagEvaluators({ k: 5 });
    const names = evaluators.map((e) => e.name);
    expect(names).toEqual(expectedNames(5));
  });

  it('returns only framework-native evaluators (no custom Faithfulness/AnswerCorrectness)', () => {
    const evaluators = buildAlertsRagEvaluators({ k: 10 });
    const names = evaluators.map((e) => e.name);
    expect(names).not.toContain('Faithfulness');
    expect(names).not.toContain('AnswerCorrectness');
  });

  it('honors the provided k for RAG evaluators (smoke check)', () => {
    // We only assert that the evaluator stack accepts `k` without throwing.
    // The actual retrieval math is the framework's responsibility and is
    // covered by `@kbn/evals`'s own tests; pinning it here would just be
    // duplicating those assertions.
    expect(() => buildAlertsRagEvaluators({ k: 5 })).not.toThrow();
    expect(() => buildAlertsRagEvaluators({ k: 20 })).not.toThrow();
  });
});

describe('toDatasetExample', () => {
  const fixture: AlertsRagExample = {
    langsmithExampleId: 'ls-1',
    input: 'what hosts are affected?',
    expected: { reference: 'SRVMAC08, SRVMAC09' },
    context: [],
    metadata: { category: 'field_specific_lookup', dataset_split: ['regression'] },
  };

  it('mirrors reference into output.expected so framework correctnessAnalysis reads it', () => {
    // The framework's `createCorrectnessAnalysisEvaluator` reads
    // `expected?.expected` (the dataset's output becomes the evaluator's
    // `expected`). Without mirroring `reference -> expected`, the judge
    // would receive `undefined` for the ground-truth answer and silently
    // score the response as unevaluable. This assertion locks that contract.
    const wrapped = toDatasetExample(fixture);
    expect(wrapped.output).toEqual({
      reference: 'SRVMAC08, SRVMAC09',
      expected: 'SRVMAC08, SRVMAC09',
    });
  });

  it('forwards metadata for the framework-side report grouping', () => {
    const wrapped = toDatasetExample(fixture);
    expect(wrapped.metadata).toEqual({
      category: 'field_specific_lookup',
      dataset_split: ['regression'],
      langsmithExampleId: 'ls-1',
    });
  });

  it('defaults context to an empty array when the example has none', () => {
    const wrapped = toDatasetExample({ ...fixture, context: undefined });
    expect(wrapped.input).toEqual({
      question: 'what hosts are affected?',
      context: [],
    });
  });
});
