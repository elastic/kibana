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
      .default('correctness')
      .describe('Evaluator that ranks the arms'),
    code_evaluators: z
      .array(z.string().max(256))
      .max(50)
      .default([])
      .describe('Deterministic evaluators; an arm with a mean below 1 on any of them is rejected'),
    alpha: z.number().min(0).max(1).default(0.05).describe('Significance level for the p-value'),
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
      .describe('True when two or more arms that beat the baseline are within min_delta of the best'),
    tied_indexes: z
      .array(z.number().int())
      .describe('Indexes into comparison.comparisons of the tied arms, empty when there is no tie'),
    tied_target_ids: z.array(z.string()).describe('Target ids of the tied arms'),
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
          'Rejects every arm below 1 on a code evaluator, then ranks the rest by the primary evaluator. The best arm wins when its mean beats the baseline and the p-value is at or below alpha. When no p-value is available the best mean above the baseline is accepted and the reasons say so. Only arms that beat the baseline can win or tie. Arms within min_delta of the best are a tie: no winner is chosen and the tied arms are listed in tied_indexes and tied_target_ids so an analyst can pick one.',
      }
    ),
    examples: [
      `## Pick a winner after comparing experiments
\`\`\`yaml
- name: winner
  type: security.aesopSelectWinner
  with:
    comparison: "\${{ steps.compare.output.comparison }}"
    primary_evaluator: correctness
    code_evaluators: ["skill-secret-scanner", "esql-compile"]
\`\`\``,
    ],
  },
};
