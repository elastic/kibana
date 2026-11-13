/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type {
  aesopSelectWinnerInputSchema,
  aesopSelectWinnerOutputSchema,
} from '../../../../common/workflows/step_types/aesop_select_winner/aesop_select_winner_step_common';

type Input = z.output<typeof aesopSelectWinnerInputSchema>;
type Output = z.output<typeof aesopSelectWinnerOutputSchema>;
type Arm = Input['comparison']['comparisons'][number];
type ArmResult = Arm['results'][number];

const EPSILON = 1e-9;

interface PrimaryScore {
  target_id: string;
  index: number;
  meanBaseline: number;
  meanTarget: number;
  improvement: number;
  pValue: number | null;
  sampleSize: number;
}

const weightedMean = (rows: ArmResult[], pick: (row: ArmResult) => number): number => {
  const total = rows.reduce((sum, row) => sum + row.sampleSize, 0);
  if (total === 0) return rows.reduce((sum, row) => sum + pick(row), 0) / rows.length;
  return rows.reduce((sum, row) => sum + pick(row) * row.sampleSize, 0) / total;
};

const format = (value: number): string => Number(value.toFixed(4)).toString();

const rejectionReasons = (arm: Arm, codeEvaluators: string[]): string[] =>
  arm.results
    .filter(({ evaluatorName, meanTarget }) => {
      return codeEvaluators.includes(evaluatorName) && meanTarget < 1 - EPSILON;
    })
    .map(
      ({ evaluatorName, meanTarget }) =>
        `code evaluator ${evaluatorName} scored ${format(meanTarget)}, below 1`
    );

/**
 * Collapses an arm's rows for the primary evaluator (one per dataset) into one score. The
 * p-value comes from the largest slice because p-values from different datasets do not combine.
 */
const scorePrimary = (arm: Arm, index: number, evaluator: string): PrimaryScore | string => {
  const rows = arm.results.filter(({ evaluatorName }) => evaluatorName === evaluator);
  if (rows.length === 0) return `no results for primary evaluator ${evaluator}`;
  if (rows.some(({ direction }) => direction === 'neutral')) {
    return `primary evaluator ${evaluator} cannot be compared across arms`;
  }
  const meanBaseline = weightedMean(rows, (row) => row.meanBaseline);
  const meanTarget = weightedMean(rows, (row) => row.meanTarget);
  const minimize = rows[0].direction === 'minimize';
  const largest = rows.reduce((best, row) => (row.sampleSize > best.sampleSize ? row : best));
  return {
    target_id: arm.target_id,
    index,
    meanBaseline,
    meanTarget,
    improvement: minimize ? meanBaseline - meanTarget : meanTarget - meanBaseline,
    pValue: largest.pValue,
    sampleSize: rows.reduce((sum, row) => sum + row.sampleSize, 0),
  };
};

const noWinner = (rejected: Output['rejected'], reasons: string[], tie = false): Output => ({
  winner_index: -1,
  winner_target_id: null,
  beats_baseline: false,
  tie,
  rejected,
  reasons,
});

export const selectWinner = (input: Input): Output => {
  const { comparisons } = input.comparison;
  const { primary_evaluator: primary, code_evaluators: codeEvaluators, alpha } = input;
  const rejected: Output['rejected'] = [];
  const scored: PrimaryScore[] = [];

  comparisons.forEach((arm, index) => {
    const reasons = rejectionReasons(arm, codeEvaluators);
    if (reasons.length > 0) {
      rejected.push({ target_id: arm.target_id, reasons });
      return;
    }
    const score = scorePrimary(arm, index, primary);
    if (typeof score === 'string') {
      rejected.push({ target_id: arm.target_id, reasons: [score] });
      return;
    }
    scored.push(score);
  });

  if (scored.length === 0) {
    return noWinner(rejected, [
      comparisons.length === 0
        ? 'no arms to compare'
        : 'every arm was rejected, so there is no winner',
    ]);
  }

  const best = scored.reduce((top, row) => (row.improvement > top.improvement ? row : top));
  const tied = scored.filter(
    ({ improvement }) => best.improvement - improvement <= input.min_delta
  );
  if (tied.length > 1) {
    return noWinner(
      rejected,
      [
        `${tied.length} arms tie on ${primary} within ${format(input.min_delta)} of the best (${tied
          .map(({ target_id: id }) => id)
          .join(', ')})`,
      ],
      true
    );
  }

  if (best.improvement <= 0) {
    return noWinner(rejected, [
      `no arm beats the baseline on ${primary}; best was ${best.target_id} at ${format(
        best.meanTarget
      )} against ${format(best.meanBaseline)}`,
    ]);
  }

  const summary = `${best.target_id} scored ${format(
    best.meanTarget
  )} on ${primary} against a baseline of ${format(best.meanBaseline)}`;
  const significant = best.pValue !== null && best.pValue <= alpha;
  const reasons = [summary];
  if (best.pValue === null) {
    reasons.push(
      `no p-value is available (n=${best.sampleSize} is too small for a test), so the best mean above the baseline is accepted`
    );
  } else if (significant) {
    reasons.push(`p=${format(best.pValue)} is at or below alpha ${format(alpha)}`);
  } else {
    reasons.push(
      `p=${format(best.pValue)} is above alpha ${format(alpha)}, so the gain is not significant`
    );
  }

  return {
    winner_index: best.index,
    winner_target_id: best.target_id,
    beats_baseline: best.pValue === null || significant,
    tie: false,
    rejected,
    reasons,
  };
};
