/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scoresByPrefixToDatasets } from './query_matrix_scores';

// The experiment scores route excludes `evaluator.metadata`, where the verdict ladder reads verdicts.
describe('verdict scoring when the server strips evaluator.metadata', () => {
  const makeStrippedDoc = (evaluatorName: string, score: number) =>
    ({
      example: { id: 'alert-analysis-a', index: 0 },
      task: { model: { id: 'anthropic-claude-4.8-opus' } },
      evaluator: { name: evaluatorName, score },
    } as never);

  it('does not count a stripped ladder doc as an unmapped verdict', () => {
    let counts: { unmappedVerdict: number } | undefined;

    scoresByPrefixToDatasets(
      [makeStrippedDoc('Factuality', 0.75), makeStrippedDoc('Relevance', 0.5)],
      ['alert-analysis'],
      {
        useVerdictLadder: true,
        onExcluded: (c: { unmappedVerdict: number }) => {
          counts = c;
        },
      } as never
    );

    expect(counts?.unmappedVerdict ?? 0).toBe(0);
  });

  it('still produces a dataset for stripped ladder scores', () => {
    const datasets = scoresByPrefixToDatasets(
      [makeStrippedDoc('Factuality', 0.75)],
      ['alert-analysis'],
      { useVerdictLadder: true } as never
    );

    expect(datasets.length).toBeGreaterThan(0);
  });
});
