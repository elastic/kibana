/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators } from '@kbn/evals';
import { createRationaleQualityEvaluator } from './rationale_evaluator';

const CRITERIA = ['criterion one', 'criterion two'];

// The wrapper builds the inner criteria evaluator eagerly at construction, so
// `criteria` is called once no matter what; capture the inner evaluate to
// assert the judge itself never runs on a missing rationale.
const makeEvaluators = (score: number) => {
  const innerEvaluate = jest.fn().mockResolvedValue({ score });
  const evaluators = {
    criteria: jest.fn().mockReturnValue({ evaluate: innerEvaluate }),
  } as unknown as DefaultEvaluators;
  return { evaluators, innerEvaluate };
};

const makeArgs = (rationale: string | undefined | null) =>
  ({
    input: { alertId: 'a1' },
    output: {
      classification: 'true_positive',
      confidenceScore: 0.9,
      rationale,
      executionId: 'exec-1',
      executionStatus: 'succeeded',
    },
    expected: { classification: 'true_positive' },
    metadata: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

describe('createRationaleQualityEvaluator', () => {
  it('scores N/A — not 0 — when the verdict has no rationale', async () => {
    // "No rationale" is a measurement gap: the judge never sees it, so absence
    // cannot be graded as a grounding failure against the criteria.
    for (const rationale of [undefined, null, '']) {
      const { evaluators, innerEvaluate } = makeEvaluators(0);
      const result = await createRationaleQualityEvaluator(evaluators, CRITERIA).evaluate(
        makeArgs(rationale)
      );
      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
      expect(innerEvaluate).not.toHaveBeenCalled();
    }
  });

  it('delegates to the criteria judge when a rationale exists', async () => {
    const { evaluators, innerEvaluate } = makeEvaluators(0.75);
    const result = await createRationaleQualityEvaluator(evaluators, CRITERIA).evaluate(
      makeArgs('process name and command line indicate…')
    );
    expect(result.score).toBe(0.75);
    expect(innerEvaluate).toHaveBeenCalledTimes(1);
  });

  it('treats a whitespace-only rationale as missing', async () => {
    const { evaluators, innerEvaluate } = makeEvaluators(0);
    const result = await createRationaleQualityEvaluator(evaluators, CRITERIA).evaluate(
      makeArgs('   ')
    );
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
    expect(innerEvaluate).not.toHaveBeenCalled();
  });
});
