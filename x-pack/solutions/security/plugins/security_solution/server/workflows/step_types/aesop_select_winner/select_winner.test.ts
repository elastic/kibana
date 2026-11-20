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
  quality_evaluators: [],
  code_tolerance: 0,
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
      tied_indexes: [],
      tied_target_ids: [],
      tiebreak_index: -1,
      tiebreak_target_id: null,
      rejected: [],
    });
    expect(result.reasons.join(' ')).toContain('p=0.01');
  });

  it('rejects an arm that fails a code evaluator even when its primary score is best', () => {
    const result = selectWinner(
      build([
        arm('leaky', [
          row({ evaluatorName: 'correctness', meanTarget: 1, pValue: 0.001 }),
          row({ evaluatorName: 'skill-secret-scanner', meanBaseline: 1, meanTarget: 0.9 }),
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
        reasons: [
          'code evaluator skill-secret-scanner scored 0.9 against a baseline of 1, a regression beyond the tolerance of 0',
        ],
      },
    ]);
  });

  it('keeps an arm that matches a baseline scoring below 1 on a code evaluator', () => {
    const result = selectWinner(
      build([
        arm('a', [
          row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
          row({ evaluatorName: 'esql-compile', meanBaseline: 0.6, meanTarget: 0.6 }),
          row({ evaluatorName: 'skill-secret-scanner', meanBaseline: 0.4, meanTarget: 0.7 }),
        ]),
      ])
    );

    expect(result).toMatchObject({ winner_target_id: 'a', beats_baseline: true, rejected: [] });
  });

  it('allows a code evaluator regression within code_tolerance and rejects one beyond it', () => {
    const arms = [
      arm('small-drop', [
        row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
        row({ evaluatorName: 'esql-compile', meanBaseline: 0.9, meanTarget: 0.86 }),
      ]),
      arm('big-drop', [
        row({ evaluatorName: 'correctness', meanTarget: 0.9, pValue: 0.01 }),
        row({ evaluatorName: 'esql-compile', meanBaseline: 0.9, meanTarget: 0.8 }),
      ]),
    ];
    const result = selectWinner(build(arms, { code_tolerance: 0.05 }));

    expect(result.winner_target_id).toBe('small-drop');
    expect(result.rejected).toEqual([
      {
        target_id: 'big-drop',
        reasons: [
          'code evaluator esql-compile scored 0.8 against a baseline of 0.9, a regression beyond the tolerance of 0.05',
        ],
      },
    ]);
  });

  it('keeps an arm whose regression equals code_tolerance despite float error', () => {
    // 0.9 - 0.85 is 0.05000000000000004, which must fall inside the epsilon margin.
    const result = selectWinner(
      build(
        [
          arm('at-limit', [
            row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
            row({ evaluatorName: 'esql-compile', meanBaseline: 0.9, meanTarget: 0.85 }),
          ]),
        ],
        { code_tolerance: 0.05 }
      )
    );

    expect(result).toMatchObject({ winner_target_id: 'at-limit', rejected: [] });
  });

  it('rejects an arm whose regression is just beyond code_tolerance', () => {
    const result = selectWinner(
      build(
        [
          arm('just-over', [
            row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
            row({ evaluatorName: 'esql-compile', meanBaseline: 0.9, meanTarget: 0.849 }),
          ]),
        ],
        { code_tolerance: 0.05 }
      )
    );

    expect(result.winner_index).toBe(-1);
    expect(result.rejected.map(({ target_id: id }) => id)).toEqual(['just-over']);
  });

  it('treats a higher mean as the regression for a code evaluator that minimizes', () => {
    const result = selectWinner(
      build([
        arm('a', [
          row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
          row({
            evaluatorName: 'esql-compile',
            meanBaseline: 2,
            meanTarget: 3,
            direction: 'minimize',
          }),
        ]),
      ])
    );

    expect(result.winner_index).toBe(-1);
    expect(result.rejected[0].reasons[0]).toContain(
      'esql-compile scored 3 against a baseline of 2'
    );
  });

  it('ignores a code evaluator that is not listed in code_evaluators', () => {
    const result = selectWinner(
      build([
        arm('a', [
          row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
          row({ evaluatorName: 'skill-pii', meanBaseline: 1, meanTarget: 0 }),
        ]),
      ])
    );

    expect(result.winner_target_id).toBe('a');
  });

  describe('quality_evaluators', () => {
    const quality = (overrides: Partial<Row>) =>
      row({ evaluatorName: 'skill-pii', meanBaseline: 0.4, meanTarget: 0.33, ...overrides });
    const withQuality = (qualityRow: Row) =>
      selectWinner(
        build(
          [
            arm('a', [
              row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
              qualityRow,
            ]),
          ],
          { code_evaluators: [], quality_evaluators: ['skill-pii'], code_tolerance: 0.05 }
        )
      );

    it('keeps an arm whose drop beyond the tolerance is not significant', () => {
      expect(withQuality(quality({ pValue: 0.5 }))).toMatchObject({
        winner_target_id: 'a',
        rejected: [],
      });
    });

    it('rejects an arm whose drop beyond the tolerance is significant', () => {
      const result = withQuality(quality({ pValue: 0.03 }));

      expect(result.winner_index).toBe(-1);
      expect(result.rejected).toEqual([
        {
          target_id: 'a',
          reasons: [
            'quality evaluator skill-pii scored 0.33 against a baseline of 0.4, a regression beyond the tolerance of 0.05 at p=0.03 (alpha 0.05)',
          ],
        },
      ]);
    });

    it('rejects a drop beyond the tolerance whose p-value equals alpha', () => {
      expect(
        withQuality(quality({ pValue: 0.05 })).rejected.map(({ target_id: id }) => id)
      ).toEqual(['a']);
    });

    it('treats a higher mean as the regression for a quality evaluator that minimizes', () => {
      const result = withQuality(
        quality({ meanBaseline: 2, meanTarget: 3, direction: 'minimize', pValue: 0.01 })
      );

      expect(result.rejected[0].reasons[0]).toContain(
        'quality evaluator skill-pii scored 3 against a baseline of 2'
      );
    });

    it('keeps a minimizing quality evaluator whose mean falls', () => {
      expect(
        withQuality(
          quality({ meanBaseline: 3, meanTarget: 2, direction: 'minimize', pValue: 0.01 })
        ).rejected
      ).toEqual([]);
    });

    it('rejects a drop beyond the tolerance when no p-value is available', () => {
      const result = withQuality(quality({ pValue: null }));

      expect(result.rejected[0].reasons[0]).toContain('with no p-value available');
    });

    it('keeps a significant drop that stays within the tolerance', () => {
      expect(withQuality(quality({ meanTarget: 0.36, pValue: 0.001 })).rejected).toEqual([]);
    });

    it('keeps the strict code rule for an evaluator listed in both', () => {
      const result = selectWinner(
        build(
          [
            arm('a', [
              row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
              row({ evaluatorName: 'esql-compile', meanBaseline: 1, meanTarget: 0.9, pValue: 0.9 }),
            ]),
          ],
          { quality_evaluators: ['esql-compile'], code_tolerance: 0.05 }
        )
      );

      expect(result.rejected[0].reasons[0]).toContain('code evaluator esql-compile');
    });

    it('rejects only the significant quality drop when replaying a live lab run', () => {
      // Factuality and esql-compile means and p-values come from a three-arm lab run in which
      // every arm lost to the strict gate; skill-pii uses that run's means (a 1-in-15 gap)
      // with an illustrative non-significant p-value.
      const pii = row({
        evaluatorName: 'skill-pii',
        sampleSize: 15,
        meanBaseline: 0.4,
        meanTarget: 1 / 3,
        pValue: 0.5,
      });
      const safety = [
        row({
          evaluatorName: 'skill-secret-scanner',
          sampleSize: 15,
          meanBaseline: 1,
          meanTarget: 1,
          pValue: 1,
        }),
        row({
          evaluatorName: 'skill-prompt-injection',
          sampleSize: 15,
          meanBaseline: 1,
          meanTarget: 1,
          pValue: 1,
        }),
      ];
      const liveArm = (id: string, factuality: number, p: number, esql: number, esqlP: number) =>
        arm(id, [
          row({
            evaluatorName: 'correctness',
            sampleSize: 15,
            meanBaseline: 0.34,
            meanTarget: factuality,
            pValue: p,
          }),
          row({
            evaluatorName: 'esql-compile',
            sampleSize: 15,
            meanBaseline: 0.934,
            meanTarget: esql,
            pValue: esqlP,
          }),
          pii,
          ...safety,
        ]);
      const result = selectWinner(
        build(
          [
            liveArm('v1', 0.299, 0.866, 0.822, 0.066),
            liveArm('v2', 0.493, 0.169, 0.825, 0.029),
            liveArm('v3', 0.417, 0.441, 0.892, 0.265),
          ],
          {
            code_evaluators: ['skill-secret-scanner', 'skill-prompt-injection'],
            quality_evaluators: ['skill-pii', 'esql-compile'],
            code_tolerance: 0.05,
          }
        )
      );

      expect(result.rejected).toEqual([
        {
          target_id: 'v2',
          reasons: [
            'quality evaluator esql-compile scored 0.825 against a baseline of 0.934, a regression beyond the tolerance of 0.05 at p=0.029 (alpha 0.05)',
          ],
        },
      ]);
      expect(result).toMatchObject({ winner_target_id: 'v3', beats_baseline: false });
    });
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

    expect(result).toMatchObject({
      winner_index: -1,
      tie: true,
      beats_baseline: false,
      tied_indexes: [0, 1],
      tied_target_ids: ['a', 'b'],
      tiebreak_index: 0,
      tiebreak_target_id: 'a',
    });
    expect(result.reasons[0]).toContain('a, b');
    expect(result.reasons[0]).not.toContain('c)');
  });

  it('reports a tie when the gap equals min_delta despite float error', () => {
    const result = selectWinner(
      build(
        [
          arm('a', [
            row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
            ...codePass,
          ]),
          arm('b', [
            row({ evaluatorName: 'correctness', meanTarget: 0.7, pValue: 0.01 }),
            ...codePass,
          ]),
        ],
        { min_delta: 0.1 }
      )
    );

    expect(result).toMatchObject({ winner_index: -1, tie: true, tied_indexes: [0, 1] });
  });

  it('does not report a tie between arms that both fall below the baseline', () => {
    const result = selectWinner(
      build(
        [
          arm('a', [
            row({ evaluatorName: 'correctness', meanTarget: 0.4, pValue: 0.01 }),
            ...codePass,
          ]),
          arm('b', [
            row({ evaluatorName: 'correctness', meanTarget: 0.4, pValue: 0.01 }),
            ...codePass,
          ]),
        ],
        { min_delta: 0.05 }
      )
    );

    expect(result).toMatchObject({
      winner_index: -1,
      tie: false,
      tied_indexes: [],
      tied_target_ids: [],
      tiebreak_index: -1,
    });
    expect(result.reasons[0]).toContain('no arm beats the baseline');
  });

  it('excludes a below-baseline arm from a tie even when it is within min_delta', () => {
    const result = selectWinner(
      build(
        [
          arm('above', [
            row({ evaluatorName: 'correctness', meanTarget: 0.52, pValue: 0.01 }),
            ...codePass,
          ]),
          arm('below', [
            row({ evaluatorName: 'correctness', meanTarget: 0.49, pValue: 0.01 }),
            ...codePass,
          ]),
        ],
        { min_delta: 0.05 }
      )
    );

    expect(result).toMatchObject({
      winner_index: 0,
      winner_target_id: 'above',
      tie: false,
      tied_indexes: [],
      tied_target_ids: [],
    });
  });

  it('breaks a tie toward the tied arm with the highest mean', () => {
    const result = selectWinner(
      build(
        [
          arm('a', [row({ evaluatorName: 'correctness', meanTarget: 0.78 }), ...codePass]),
          arm('b', [row({ evaluatorName: 'correctness', meanTarget: 0.8 }), ...codePass]),
          arm('c', [row({ evaluatorName: 'correctness', meanTarget: 0.6 }), ...codePass]),
        ],
        { min_delta: 0.05 }
      )
    );

    expect(result).toMatchObject({
      winner_index: -1,
      tie: true,
      tied_target_ids: ['a', 'b'],
      tiebreak_index: 1,
      tiebreak_target_id: 'b',
    });
  });

  it('breaks an exact tie toward the lowest arm index', () => {
    const result = selectWinner(
      build([
        arm('a', [row({ evaluatorName: 'correctness', meanTarget: 0.8 }), ...codePass]),
        arm('b', [row({ evaluatorName: 'correctness', meanTarget: 0.8 }), ...codePass]),
      ])
    );

    expect(result).toMatchObject({
      tie: true,
      tied_indexes: [0, 1],
      tiebreak_index: 0,
      tiebreak_target_id: 'a',
    });
  });

  it('breaks a tie toward the lowest mean when the primary evaluator minimizes', () => {
    const result = selectWinner(
      build(
        [
          arm('a', [
            row({
              evaluatorName: 'correctness',
              meanBaseline: 0.9,
              meanTarget: 0.4,
              direction: 'minimize',
            }),
            ...codePass,
          ]),
          arm('b', [
            row({
              evaluatorName: 'correctness',
              meanBaseline: 0.9,
              meanTarget: 0.38,
              direction: 'minimize',
            }),
            ...codePass,
          ]),
        ],
        { min_delta: 0.05 }
      )
    );

    expect(result).toMatchObject({ tie: true, tiebreak_index: 1, tiebreak_target_id: 'b' });
  });

  describe('tiebreak_beats_baseline', () => {
    const tieOf = (tiebreakPValue: number | null) =>
      selectWinner(
        build(
          [
            arm('a', [
              row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: tiebreakPValue }),
              ...codePass,
            ]),
            arm('b', [
              row({ evaluatorName: 'correctness', meanTarget: 0.7, pValue: 0.01 }),
              ...codePass,
            ]),
          ],
          { min_delta: 0.2 }
        )
      );

    it('is false when the tiebreak arm gain is not significant', () => {
      expect(tieOf(0.4)).toMatchObject({
        tie: true,
        tiebreak_target_id: 'a',
        tiebreak_beats_baseline: false,
      });
    });

    it('is true when the tiebreak arm gain is significant', () => {
      expect(tieOf(0.01)).toMatchObject({ tie: true, tiebreak_beats_baseline: true });
    });

    it('is true when the tiebreak arm has no p-value', () => {
      expect(tieOf(null)).toMatchObject({ tie: true, tiebreak_beats_baseline: true });
    });

    it('is false when there is no tie', () => {
      const result = selectWinner(
        build([
          arm('a', [
            row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01 }),
            ...codePass,
          ]),
        ])
      );
      expect(result).toMatchObject({ tie: false, tiebreak_beats_baseline: false });
    });
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

  describe('best', () => {
    it('reports the winning arm numbers', () => {
      const result = selectWinner(
        build([
          arm('a', [
            row({ evaluatorName: 'correctness', meanTarget: 0.6, pValue: 0.2 }),
            ...codePass,
          ]),
          arm('b', [
            row({ evaluatorName: 'correctness', meanTarget: 0.8, pValue: 0.01, sampleSize: 30 }),
            ...codePass,
          ]),
        ])
      );

      expect(result.best).toEqual({
        index: 1,
        target_id: 'b',
        mean: 0.8,
        baseline_mean: 0.5,
        improvement: expect.closeTo(0.3, 9),
        p_value: 0.01,
        sample_size: 30,
      });
    });

    it('reports the closest arm when nothing beats the baseline', () => {
      const result = selectWinner(
        build([
          arm('a', [
            row({ evaluatorName: 'correctness', meanTarget: 0.3, pValue: 0.01 }),
            ...codePass,
          ]),
          arm('b', [
            row({ evaluatorName: 'correctness', meanTarget: 0.45, pValue: 0.6 }),
            ...codePass,
          ]),
        ])
      );

      expect(result.winner_index).toBe(-1);
      expect(result.best).toMatchObject({ target_id: 'b', improvement: expect.closeTo(-0.05, 9) });
    });

    it('reports the best tied arm on a tie', () => {
      const result = selectWinner(
        build(
          [
            arm('a', [
              row({ evaluatorName: 'correctness', meanTarget: 0.7, pValue: 0.01 }),
              ...codePass,
            ]),
            arm('b', [
              row({ evaluatorName: 'correctness', meanTarget: 0.71, pValue: 0.01 }),
              ...codePass,
            ]),
          ],
          { min_delta: 0.02 }
        )
      );

      expect(result.tie).toBe(true);
      expect(result.best).toMatchObject({ target_id: 'b', mean: 0.71 });
    });

    it('is null when every arm is rejected', () => {
      expect(selectWinner(build([arm('a', codePass)])).best).toBeNull();
    });
  });
});
