/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { aesopSelectWinnerInputSchema } from '../../../../common/workflows/step_types/aesop_select_winner/aesop_select_winner_step_common';
import { selectWinner } from './select_winner';

type Input = z.output<typeof aesopSelectWinnerInputSchema>;
type Arm = Input['comparison']['comparisons'][number];
type Row = Arm['results'][number];

const row = (overrides: Partial<Row> & Pick<Row, 'evaluatorName'>): Row => ({
  sampleSize: 20,
  meanBaseline: 0.5,
  meanTarget: 0.5,
  pValue: 0.5,
  direction: 'maximize',
  ...overrides,
});

const arm = (target_id: string, results: Row[]): Arm => ({ target_id, results });

const build = (comparisons: Arm[], overrides: Partial<Input> = {}): Input => ({
  comparison: { baseline_id: 'baseline', comparisons },
  primary_evaluator: 'correctness',
  code_evaluators: ['esql-compile', 'skill-secret-scanner'],
  alpha: 0.05,
  min_delta: 0,
  ...overrides,
});

const codePass = [
  row({ evaluatorName: 'esql-compile', meanBaseline: 1, meanTarget: 1 }),
  row({ evaluatorName: 'skill-secret-scanner', meanBaseline: 1, meanTarget: 1 }),
];

describe('selectWinner', () => {
  it('picks the arm with the largest significant gain', () => {
    const result = selectWinner(
      build([
        arm('a', [
          row({ evaluatorName: 'correctness', meanTarget: 0.6, pValue: 0.3 }),
          ...codePass,
        ]),
        arm('b', [
          row({ evaluatorName: 'correctness', meanTarget: 0.9, pValue: 0.01 }),
          ...codePass,
        ]),
      ])
    );

    expect(result).toMatchObject({
      winner_index: 1,
      winner_target_id: 'b',
      beats_baseline: true,
      tie: false,
      rejected: [],
    });
    expect(result.reasons.join(' ')).toContain('p=0.01');
  });

  it('rejects an arm that fails a code evaluator even when its primary score is best', () => {
    const result = selectWinner(
      build([
        arm('leaky', [
          row({ evaluatorName: 'correctness', meanTarget: 1, pValue: 0.001 }),
          row({ evaluatorName: 'skill-secret-scanner', meanTarget: 0.9 }),
          codePass[0],
        ]),
        arm('clean', [
          row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.02 }),
          ...codePass,
        ]),
      ])
    );

    expect(result.winner_target_id).toBe('clean');
    expect(result.rejected).toEqual([
      {
        target_id: 'leaky',
        reasons: ['code evaluator skill-secret-scanner scored 0.9, below 1'],
      },
    ]);
  });

  it('returns no winner when every arm is rejected by a code evaluator', () => {
    const failing = [
      row({ evaluatorName: 'correctness', meanTarget: 0.9, pValue: 0.01 }),
      row({ evaluatorName: 'esql-compile', meanTarget: 0 }),
    ];
    const result = selectWinner(build([arm('a', failing), arm('b', failing)]));

    expect(result).toMatchObject({
      winner_index: -1,
      winner_target_id: null,
      beats_baseline: false,
      tie: false,
    });
    expect(result.rejected.map(({ target_id: id }) => id)).toEqual(['a', 'b']);
    expect(result.reasons[0]).toContain('every arm was rejected');
  });

  it('reports a tie when arms sit within min_delta and names no winner', () => {
    const result = selectWinner(
      build(
        [
          arm('a', [
            row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
            ...codePass,
          ]),
          arm('b', [
            row({ evaluatorName: 'correctness', meanTarget: 0.78, pValue: 0.01 }),
            ...codePass,
          ]),
          arm('c', [
            row({ evaluatorName: 'correctness', meanTarget: 0.6, pValue: 0.01 }),
            ...codePass,
          ]),
        ],
        { min_delta: 0.05 }
      )
    );

    expect(result).toMatchObject({ winner_index: -1, tie: true, beats_baseline: false });
    expect(result.reasons[0]).toContain('a, b');
    expect(result.reasons[0]).not.toContain('c)');
  });

  it('returns no winner when nothing beats the baseline', () => {
    const result = selectWinner(
      build([
        arm('a', [
          row({ evaluatorName: 'correctness', meanTarget: 0.4, pValue: 0.01 }),
          ...codePass,
        ]),
        arm('b', [
          row({ evaluatorName: 'correctness', meanTarget: 0.5, pValue: 0.9 }),
          ...codePass,
        ]),
      ])
    );

    expect(result).toMatchObject({
      winner_index: -1,
      winner_target_id: null,
      beats_baseline: false,
    });
    expect(result.reasons[0]).toContain('no arm beats the baseline');
  });

  it('accepts the best mean above baseline when the p-value is null and says so', () => {
    const result = selectWinner(
      build([
        arm('a', [
          row({ evaluatorName: 'correctness', meanTarget: 0.7, pValue: null, sampleSize: 3 }),
          ...codePass,
        ]),
      ])
    );

    expect(result).toMatchObject({ winner_index: 0, beats_baseline: true });
    expect(result.reasons.join(' ')).toContain('no p-value is available');
  });

  it('names the winner but does not call it a baseline beat when the gain is not significant', () => {
    const result = selectWinner(
      build([
        arm('a', [
          row({ evaluatorName: 'correctness', meanTarget: 0.7, pValue: 0.4 }),
          ...codePass,
        ]),
      ])
    );

    expect(result).toMatchObject({ winner_index: 0, winner_target_id: 'a', beats_baseline: false });
    expect(result.reasons.join(' ')).toContain('not significant');
  });

  it('treats a lower mean as the improvement when the direction is minimize', () => {
    const result = selectWinner(
      build(
        [
          arm('slow', [
            row({
              evaluatorName: 'latency',
              meanBaseline: 10,
              meanTarget: 12,
              direction: 'minimize',
              pValue: 0.01,
            }),
          ]),
          arm('fast', [
            row({
              evaluatorName: 'latency',
              meanBaseline: 10,
              meanTarget: 6,
              direction: 'minimize',
              pValue: 0.01,
            }),
          ]),
        ],
        { primary_evaluator: 'latency', code_evaluators: [] }
      )
    );

    expect(result).toMatchObject({ winner_target_id: 'fast', beats_baseline: true });
  });

  it('rejects an arm with no result for the primary evaluator', () => {
    const result = selectWinner(build([arm('a', codePass)]));

    expect(result.winner_index).toBe(-1);
    expect(result.rejected[0].reasons[0]).toContain('no results for primary evaluator correctness');
  });

  it('returns no winner for an empty comparison', () => {
    expect(selectWinner(build([])).reasons).toEqual(['no arms to compare']);
  });
});
