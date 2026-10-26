/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult } from '@kbn/evals';
import type { HuntEvaluator } from './dataset_evaluator';
import { assertCodeScoresPass, createRunCollector, withScoreCollection } from './run_summary';

const evaluatorReturning = (
  name: string,
  kind: HuntEvaluator['kind'],
  result: EvaluationResult
): HuntEvaluator => ({
  name,
  kind,
  direction: 'maximize',
  evaluate: async () => result,
});

const params = {
  input: { spaceId: 'default', reportIds: ['ti-report-a'] },
  output: {},
  expected: {},
  metadata: undefined,
} as unknown as Parameters<HuntEvaluator['evaluate']>[0];

const runAll = async (evaluators: HuntEvaluator[]) => {
  const collector = createRunCollector();
  for (const evaluator of withScoreCollection(evaluators, collector)) {
    await evaluator.evaluate(params);
  }
  return collector;
};

describe('withScoreCollection', () => {
  it.each([
    ['a CODE score of 0', 'CODE', { score: 0, explanation: 'outcome "partial"' }, 1],
    ['a MISSING CODE result', 'CODE', { score: null, label: 'MISSING' }, 1],
    ['an N/A CODE result', 'CODE', { score: null, label: 'N/A' }, 0],
    ['a passing CODE score', 'CODE', { score: 1 }, 0],
    ['a low LLM score', 'LLM', { score: 0.4 }, 0],
  ] as const)('records %s as %d CODE failure(s)', async (_name, kind, result, count) => {
    const collector = await runAll([evaluatorReturning('Outcome Label', kind, result)]);
    expect(collector.codeFailures).toHaveLength(count);
  });

  it('names the row a CODE failure came from', async () => {
    const collector = await runAll([
      evaluatorReturning('Outcome Label', 'CODE', { score: 0, explanation: 'outcome "partial"' }),
    ]);
    expect(collector.codeFailures[0]).toEqual({
      evaluator: 'Outcome Label',
      row: 'default: ti-report-a',
      score: 0,
      label: undefined,
      explanation: 'outcome "partial"',
    });
  });

  it('records every score in the sink regardless of kind or label', async () => {
    const collector = await runAll([
      evaluatorReturning('Outcome Label', 'CODE', { score: 1 }),
      evaluatorReturning('Outcome Label', 'CODE', { score: null, label: 'N/A' }),
    ]);
    expect(collector.scores.get('Outcome Label')).toEqual([1, null]);
  });
});

describe('assertCodeScoresPass', () => {
  it('returns without throwing when there are no CODE failures', () => {
    expect(() => assertCodeScoresPass('golden', [])).not.toThrow();
  });

  it('throws naming every failing evaluator and row', () => {
    expect(() =>
      assertCodeScoresPass('golden', [
        { evaluator: 'Outcome Label', row: 'default: a', score: 0, explanation: 'bad outcome' },
        { evaluator: 'SSE Attachment', row: 'default: b', score: null, label: 'MISSING' },
      ])
    ).toThrow(
      /Outcome Label \[default: a\]: 0 \(bad outcome\)[\s\S]*SSE Attachment \[default: b\]: MISSING/
    );
  });
});
