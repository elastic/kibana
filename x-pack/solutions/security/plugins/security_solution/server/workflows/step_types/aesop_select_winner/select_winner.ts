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
type Selection = Omit<Output, 'primary_means'>;
type Arm = Input['comparison']['comparisons'][number];
type ArmResult = Arm['results'][number];

const EPSILON = 1e-9;

interface PrimaryScore {
  target_id: string;
  index: number;
  meanBaseline: number;
  meanTarget: number;
  minimize: boolean;
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

/** A neutral evaluator is gated as if higher were better; list only directional evaluators. */
const regressionOf = ({ meanTarget, meanBaseline, direction }: ArmResult): number =>
  direction === 'minimize' ? meanTarget - meanBaseline : meanBaseline - meanTarget;

/**
 * Code evaluators grade the agent's answers, not the skill document, so the baseline does not
 * score 1 on them either (a triage answer that cites an IP trips the PII scanner). An arm is
 * rejected when it is worse than the baseline by more than the tolerance. Quality evaluators
 * additionally need the drop to be significant: on a small dataset one answer moves the mean
 * past the tolerance, and that noise must not veto an arm the primary evaluator prefers.
 * Each quality row is tested at alpha on its own, with no correction for the number of rows.
 */
const rejectionReasons = (
  arm: Arm,
  codeEvaluators: string[],
  qualityEvaluators: string[],
  tolerance: number,
  alpha: number
): string[] =>
  arm.results.flatMap((result) => {
    const { evaluatorName, meanTarget, meanBaseline, pValue } = result;
    const isCode = codeEvaluators.includes(evaluatorName);
    const isQuality = !isCode && qualityEvaluators.includes(evaluatorName);
    if (!isCode && !isQuality) return [];
    if (regressionOf(result) <= tolerance + EPSILON) return [];
    const scored = `scored ${format(meanTarget)} against a baseline of ${format(meanBaseline)}`;
    if (isCode) {
      return [
        `code evaluator ${evaluatorName} ${scored}, a regression beyond the tolerance of ${format(
          tolerance
        )}`,
      ];
    }
    if (pValue !== null && pValue > alpha) return [];
    return [
      `quality evaluator ${evaluatorName} ${scored}, a regression beyond the tolerance of ${format(
        tolerance
      )}${
        pValue === null
          ? ' with no p-value available'
          : ` at p=${format(pValue)} (alpha ${format(alpha)})`
      }`,
    ];
  });

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
    minimize,
    improvement: minimize ? meanBaseline - meanTarget : meanTarget - meanBaseline,
    pValue: largest.pValue,
    sampleSize: rows.reduce((sum, row) => sum + row.sampleSize, 0),
  };
};

/**
 * The tied arm with the best primary mean (lowest when the evaluator minimizes); equal means go to
 * the lowest arm index, which keeps the pick deterministic.
 */
const pickTiebreak = (tied: PrimaryScore[]): PrimaryScore =>
  tied.reduce((top, row) => {
    const diff = row.minimize ? top.meanTarget - row.meanTarget : row.meanTarget - top.meanTarget;
    if (diff > EPSILON) return row;
    if (diff < -EPSILON) return top;
    return row.index < top.index ? row : top;
  });

const toBest = (score: PrimaryScore | null): Output['best'] =>
  score === null
    ? null
    : {
        index: score.index,
        target_id: score.target_id,
        mean: score.meanTarget,
        baseline_mean: score.meanBaseline,
        improvement: score.improvement,
        p_value: score.pValue,
        sample_size: score.sampleSize,
      };

const noWinner = (
  rejected: Output['rejected'],
  reasons: string[],
  best: PrimaryScore | null = null,
  tied: PrimaryScore[] = [],
  tiebreak: PrimaryScore | null = null,
  alpha = 0
): Selection => ({
  winner_index: -1,
  winner_target_id: null,
  beats_baseline: false,
  tie: tied.length > 0,
  tied_indexes: tied.map(({ index }) => index),
  tied_target_ids: tied.map(({ target_id: id }) => id),
  tiebreak_index: tiebreak?.index ?? -1,
  tiebreak_target_id: tiebreak?.target_id ?? null,
  tiebreak_beats_baseline:
    tiebreak !== null && (tiebreak.pValue === null || tiebreak.pValue <= alpha),
  best: toBest(best),
  rejected,
  reasons,
});

const select = (input: Input): Selection => {
  const { comparisons } = input.comparison;
  const {
    primary_evaluator: primary,
    code_evaluators: codeEvaluators,
    quality_evaluators: qualityEvaluators,
    code_tolerance: codeTolerance,
    alpha,
  } = input;
  const rejected: Output['rejected'] = [];
  const scored: PrimaryScore[] = [];

  comparisons.forEach((arm, index) => {
    const reasons = rejectionReasons(arm, codeEvaluators, qualityEvaluators, codeTolerance, alpha);
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
  const qualifying = scored.filter(({ improvement }) => improvement > 0);
  if (qualifying.length === 0) {
    return noWinner(
      rejected,
      [
        `no arm beats the baseline on ${primary}; best was ${best.target_id} at ${format(
          best.meanTarget
        )} against ${format(best.meanBaseline)}`,
      ],
      best
    );
  }

  const tied = qualifying.filter(
    ({ improvement }) => best.improvement - improvement <= input.min_delta + EPSILON
  );
  if (tied.length > 1) {
    return noWinner(
      rejected,
      [
        `${tied.length} arms tie on ${primary} within ${format(input.min_delta)} of the best (${tied
          .map(({ target_id: id }) => id)
          .join(', ')})`,
      ],
      best,
      tied,
      pickTiebreak(tied),
      alpha
    );
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
    tied_indexes: [],
    tied_target_ids: [],
    tiebreak_index: -1,
    tiebreak_target_id: null,
    tiebreak_beats_baseline: false,
    best: toBest(best),
    rejected,
    reasons,
  };
};

/**
 * Every arm's primary mean sits next to the selection so a caller can compare two arms of the
 * same run (a refine round's rewrite against the previous best), not only an arm and the baseline.
 */
export const selectWinner = (input: Input): Output => ({
  ...select(input),
  primary_means: input.comparison.comparisons.map((arm, index) => {
    const score = scorePrimary(arm, index, input.primary_evaluator);
    return typeof score === 'string' ? null : score.meanTarget;
  }),
});
