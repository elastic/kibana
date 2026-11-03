/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { POSITIVE_CONTROL_RECALL_THRESHOLD } from './audit_positive_control_recall_evaluator';
import type { WorkerEvaluator } from './dataset_evaluator';
import {
  assertCodeScoresPass,
  createRunCollector,
  isCodeMiss,
  withScoreCollection,
} from './run_summary';

const ROW = {
  input: { scenarioId: 'positive-chain-with-noise', spaceId: 'space' },
  output: {},
  expected: undefined,
  metadata: undefined,
} as unknown as Parameters<WorkerEvaluator['evaluate']>[0];

const evaluatorScoring = ({
  name,
  kind = 'CODE',
  score,
  label,
}: {
  name: string;
  kind?: 'CODE' | 'LLM';
  score: number | null;
  label?: string;
}): WorkerEvaluator => ({
  name,
  kind,
  direction: 'maximize',
  evaluate: async () => ({ score, label }),
});

const gate = async (evaluator: WorkerEvaluator) => {
  const collector = createRunCollector();
  const [wrapped] = withScoreCollection([evaluator], collector);
  await wrapped.evaluate(ROW);
  return collector.codeFailures;
};

describe('CODE gate', () => {
  it('passes a fractional PositiveControlRecall that meets its threshold', async () => {
    const failures = await gate(
      evaluatorScoring({
        name: 'PositiveControlRecall',
        score: POSITIVE_CONTROL_RECALL_THRESHOLD,
        label: 'recalled',
      })
    );
    expect(failures).toEqual([]);
    expect(() => assertCodeScoresPass('dataset', failures)).not.toThrow();
  });

  it('fails a PositiveControlRecall below its threshold', async () => {
    const failures = await gate(
      evaluatorScoring({ name: 'PositiveControlRecall', score: 0.5, label: 'missed' })
    );
    expect(failures).toHaveLength(1);
    expect(() => assertCodeScoresPass('dataset', failures)).toThrow(/PositiveControlRecall/);
  });

  it('still requires exactly 1 from evaluators without a threshold', async () => {
    const failures = await gate(evaluatorScoring({ name: 'NegativeControl', score: 0.9 }));
    expect(failures).toHaveLength(1);
  });

  it('keeps null as N/A when labelled N/A and as a miss otherwise', () => {
    expect(isCodeMiss({ evaluator: 'PositiveControlRecall', score: null, label: 'N/A' })).toBe(
      false
    );
    expect(isCodeMiss({ evaluator: 'PositiveControlRecall', score: null, label: 'MISSING' })).toBe(
      true
    );
    expect(isCodeMiss({ evaluator: 'NegativeControl', score: null })).toBe(true);
  });

  it('records every score, including a passing fractional one, for the run summary', async () => {
    const collector = createRunCollector();
    const [wrapped] = withScoreCollection(
      [evaluatorScoring({ name: 'PositiveControlRecall', score: 0.75, label: 'recalled' })],
      collector
    );
    await wrapped.evaluate(ROW);
    expect(collector.scores.get('PositiveControlRecall')).toEqual([0.75]);
  });

  it('does not gate LLM judges', async () => {
    expect(
      await gate(evaluatorScoring({ name: 'VerdictRationaleRubric', kind: 'LLM', score: 0 }))
    ).toEqual([]);
  });
});
