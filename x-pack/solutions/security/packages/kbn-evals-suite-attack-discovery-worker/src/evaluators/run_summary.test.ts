/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { POSITIVE_CONTROL_RECALL_THRESHOLD } from './audit_positive_control_recall_evaluator';
import { computeScoreStats } from '../score_stats';
import type { WorkerEvaluator } from './dataset_evaluator';
import {
  assertCodeScoresPass,
  createRunCollector,
  describeRow,
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

  it('keeps an unjudgeable check (null score, no_citations) a miss, though the mean skips it', () => {
    expect(isCodeMiss({ evaluator: 'ForbiddenJoin', score: null, label: 'no_citations' })).toBe(
      true
    );
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

  describe('an evaluator that throws', () => {
    const throwing = (kind: 'CODE' | 'LLM'): WorkerEvaluator => ({
      name: kind === 'CODE' ? 'RunnerCompleted' : 'VerdictRationaleRubric',
      kind,
      direction: 'maximize',
      evaluate: async () => {
        throw new Error('Missing scores for criterion 2');
      },
    });

    it('never escapes: it becomes an EVALUATOR_FAILED null and is handed to the callback', async () => {
      const onError = jest.fn();
      const [wrapped] = withScoreCollection(
        [throwing('LLM')],
        createRunCollector(),
        undefined,
        onError
      );
      await expect(wrapped.evaluate(ROW)).resolves.toEqual({
        score: null,
        label: 'EVALUATOR_FAILED',
        explanation: 'Missing scores for criterion 2',
      });
      expect(onError).toHaveBeenCalledWith(ROW.input, 'VerdictRationaleRubric', expect.any(Error));
    });

    it('is a gated miss for a CODE evaluator', async () => {
      expect(await gate(throwing('CODE'))).toEqual([
        expect.objectContaining({
          evaluator: 'RunnerCompleted',
          score: null,
          label: 'EVALUATOR_FAILED',
        }),
      ]);
    });

    it('is not gated for a judge, and counts as unscored, never as a pass', async () => {
      const collector = createRunCollector();
      const [wrapped] = withScoreCollection([throwing('LLM')], collector);
      await wrapped.evaluate(ROW);
      expect(collector.codeFailures).toEqual([]);
      expect(collector.scores.get('VerdictRationaleRubric')).toEqual([null]);
      expect(computeScoreStats([null])).toMatchObject({ n: 0, naCount: 1 });
    });

    it('scores a CODE miss on a row with an undefined input without throwing', async () => {
      const collector = createRunCollector();
      const [wrapped] = withScoreCollection(
        [evaluatorScoring({ name: 'RunnerCompleted', score: null, label: 'ROW_FAILED' })],
        collector
      );
      await wrapped.evaluate({ ...ROW, input: undefined } as unknown as typeof ROW);
      expect(collector.codeFailures).toEqual([expect.objectContaining({ row: 'unknown row' })]);
    });
  });

  describe('describeRow', () => {
    it('names the space and scenario', () => {
      expect(describeRow({ spaceId: 's', scenarioId: 'x' })).toBe('s: x');
    });

    it('tolerates a missing or partial input', () => {
      expect(describeRow(undefined)).toBe('unknown row');
      expect(describeRow(null)).toBe('unknown row');
      expect(describeRow({})).toBe('unknown row');
      expect(describeRow({ scenarioId: 'x' })).toBe('?: x');
    });
  });

  it('does not gate LLM judges', async () => {
    expect(
      await gate(evaluatorScoring({ name: 'VerdictRationaleRubric', kind: 'LLM', score: 0 }))
    ).toEqual([]);
  });
});
