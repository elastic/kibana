/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

export const AesopSelectWinnerStepId = 'security.aesopSelectWinner' as const;

const comparisonResultSchema = () =>
  z.object({
    evaluatorName: z.string().max(256),
    sampleSize: z.number().int(),
    meanBaseline: z.number(),
    meanTarget: z.number(),
    pValue: z.number().nullable(),
    direction: z.enum(['maximize', 'minimize', 'neutral']),
  });

export const aesopSelectWinnerInputSchema = lazySchema(() =>
  z.object({
    comparison: z
      .object({
        baseline_id: z.string().max(512),
        comparisons: z
          .array(
            z.object({
              target_id: z.string().max(512),
              results: z.array(comparisonResultSchema()).max(500),
            })
          )
          .max(20),
      })
      .describe('Output of the evals compareExperiments step: baseline against every arm'),
    primary_evaluator: z
      .string()
      .max(256)
      .default('correctness.factuality')
      .describe('Evaluator that ranks the arms, matched exactly against the comparison rows'),
    code_evaluators: z
      .array(z.string().max(256))
      .max(50)
      .default([])
      .describe(
        'Deterministic evaluators; an arm that scores worse than the baseline by more than code_tolerance on any of them is rejected'
      ),
    quality_evaluators: z
      .array(z.string().max(256))
      .max(50)
      .default([])
      .describe(
        'Deterministic evaluators that score answer quality; an arm is rejected only when it falls below the baseline by more than code_tolerance and the drop is significant at alpha (or has no p-value)'
      ),
    code_tolerance: z
      .number()
      .min(0)
      .max(1)
      .default(0)
      .describe(
        'How far an arm may fall below the baseline on a code or quality evaluator before rejection'
      ),
    alpha: z
      .number()
      .min(0)
      .max(1)
      .default(0.05)
      .describe(
        'Significance level for the primary p-value and for quality evaluator regressions; lowering it raises the bar for a winner and lowers it for rejecting a quality regression'
      ),
    min_delta: z
      .number()
      .min(0)
      .default(0)
      .describe('Arms whose primary means are within this distance of the best arm are tied'),
  })
);

export const aesopSelectWinnerOutputSchema = lazySchema(() =>
  z.object({
    winner_index: z
      .number()
      .int()
      .describe('Index into comparison.comparisons of the winning arm, -1 when there is none'),
    winner_target_id: z.string().nullable(),
    beats_baseline: z
      .boolean()
      .describe('True when the winner improves on the baseline significantly, or n is too small'),
    tie: z
      .boolean()
      .describe(
        'True when two or more arms that beat the baseline are within min_delta of the best'
      ),
    tied_indexes: z
      .array(z.number().int())
      .describe('Indexes into comparison.comparisons of the tied arms, empty when there is no tie'),
    tied_target_ids: z.array(z.string()).describe('Target ids of the tied arms'),
    tiebreak_index: z
      .number()
      .int()
      .describe(
        'Index into comparison.comparisons of the tied arm with the best primary mean (lowest index on equal means), -1 when there is no tie'
      ),
    tiebreak_target_id: z
      .string()
      .nullable()
      .describe('Target id of the tiebreak arm, null when there is no tie'),
    tiebreak_beats_baseline: z
      .boolean()
      .describe(
        'True when the tiebreak arm improves on the baseline significantly, or n is too small; false when there is no tie'
      ),
    best: z
      .object({
        index: z.number().int(),
        target_id: z.string(),
        mean: z.number(),
        baseline_mean: z.number(),
        improvement: z
          .number()
          .describe('Gain over the baseline in the improving direction; negative when worse'),
        p_value: z.number().nullable(),
        sample_size: z.number().int(),
      })
      .nullable()
      .describe(
        'Primary evaluator numbers of the arm with the largest gain among the arms that were not rejected, whether or not it beats the baseline; null when every arm was rejected'
      ),
    primary_means: z
      .array(z.number().nullable())
      .describe(
        'Primary evaluator mean of every arm, in comparison.comparisons order and rejected arms included; null for an arm without a comparable primary score'
      ),
    rejected: z.array(
      z.object({
        target_id: z.string(),
        reasons: z.array(z.string()),
      })
    ),
    reasons: z.array(z.string()),
  })
);

export const aesopSelectWinnerStepCommonDefinition: BaseStepDefinition<
  typeof aesopSelectWinnerInputSchema,
  typeof aesopSelectWinnerOutputSchema
> = {
  id: AesopSelectWinnerStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.aesopSelectWinner.label', {
    defaultMessage: 'Select AESOP winner',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.aesopSelectWinner.description',
    {
      defaultMessage:
        'Picks the best skill variant from a baseline-versus-arms experiment comparison, rejecting arms that fail a deterministic check.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  inputSchema: aesopSelectWinnerInputSchema,
  outputSchema: aesopSelectWinnerOutputSchema,
  stability: 'tech_preview',
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.aesopSelectWinner.documentation.details',
      {
        defaultMessage:
          'Rejects every arm that scores worse than the baseline by more than code_tolerance on a code evaluator (code evaluators grade the answers, so the baseline rarely scores 1 either), or by more than code_tolerance with a p-value at or below alpha (or no p-value) on a quality evaluator, then ranks the rest by the primary evaluator. The best arm wins when its mean beats the baseline and the p-value is at or below alpha. When no p-value is available the best mean above the baseline is accepted and the reasons say so. Only arms that beat the baseline can win or tie. Arms within min_delta of the best are a tie: no winner is chosen and the tied arms are listed in tied_indexes and tied_target_ids so an analyst can pick one. tiebreak_index names the tied arm with the best primary mean (the lowest index on equal means), the arm a tie approval deploys. tiebreak_beats_baseline applies the winner significance rule to that arm (p-value at or below alpha, or no p-value) and is false when there is no tie, so a tie whose tiebreak gain is not significant is not deployed.',
      }
    ),
    examples: [
      `## Pick a winner after comparing experiments
\`\`\`yaml
- name: winner
  type: security.aesopSelectWinner
  with:
    comparison: "\${{ steps.compare.output.comparison }}"
    primary_evaluator: correctness.factuality
    code_evaluators: ["skill-secret-scanner", "esql-compile"]
\`\`\``,
    ],
  },
};
