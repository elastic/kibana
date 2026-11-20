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

export const AesopCollectFailuresStepId = 'security.aesopCollectFailures' as const;

export const AESOP_COLLECT_FAILURES_MAX = 25;

export const aesopCollectFailuresInputSchema = lazySchema(() =>
  z.object({
    experiment_id: z.string().min(1).max(256).describe('Experiment whose scores are read'),
    evaluator: z
      .string()
      .min(1)
      .max(256)
      .default('correctness.factuality')
      .describe('Score name (evaluator.name on the score documents) that decides a failure'),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.75)
      .describe('An example fails when its mean score over the repetitions is below this'),
    max_failures: z
      .number()
      .int()
      .min(1)
      .max(AESOP_COLLECT_FAILURES_MAX)
      .default(10)
      .describe('Lowest-scoring failed examples to return'),
    max_chars: z
      .number()
      .int()
      .min(100)
      .max(10000)
      .default(2000)
      .describe('Each question, answer and explanation is cut to this many characters'),
  })
);

export const aesopCollectFailuresOutputSchema = lazySchema(() =>
  z.object({
    scored_examples: z.number().int().describe('Examples that have a score for the evaluator'),
    failed_examples: z.number().int().describe('Examples whose mean is below the threshold'),
    mean_score: z.number().nullable().describe('Mean over every scored example, null when none'),
    failures: z.array(
      z.object({
        example_id: z.string(),
        example_index: z.number().int().nullable(),
        repetition_index: z.number().int(),
        score: z.number().describe('Mean score of the example over its repetitions'),
        question: z.string(),
        answer: z.string(),
        explanation: z.string(),
        mentions_reference: z
          .boolean()
          .describe(
            'True when the judge explanation mentions a reference or expected answer, so it may quote it'
          ),
      })
    ),
    mentions_reference_count: z.number().int(),
    markdown: z
      .string()
      .describe('The failures rendered as markdown, for a rewrite prompt; empty when none'),
  })
);

export const aesopCollectFailuresStepCommonDefinition: BaseStepDefinition<
  typeof aesopCollectFailuresInputSchema,
  typeof aesopCollectFailuresOutputSchema
> = {
  id: AesopCollectFailuresStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.aesopCollectFailures.label', {
    defaultMessage: 'Collect AESOP failures',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.aesopCollectFailures.description',
    {
      defaultMessage:
        'Reads an experiment’s scores and returns its lowest-scoring examples with the question, the agent’s answer and the judge’s explanation, never the expected answer.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  inputSchema: aesopCollectFailuresInputSchema,
  outputSchema: aesopCollectFailuresOutputSchema,
  stability: 'tech_preview',
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.aesopCollectFailures.documentation.details',
      {
        defaultMessage:
          'Groups the experiment’s score documents for the evaluator by example and averages each example over its repetitions. Examples below the threshold fail; the lowest max_failures are returned, each with its worst repetition: the example input, the task output and the judge explanation. The expected output lives only in the dataset, which this step never reads, so a rewrite fed with this output cannot copy the answers. A judge explanation can still quote the reference answer; mentions_reference flags explanations that mention one.',
      }
    ),
    examples: [
      `## Collect the failures of the best arm
\`\`\`yaml
- name: failures
  type: security.aesopCollectFailures
  with:
    experiment_id: "\${{ steps.winner.output.best.target_id }}"
    threshold: 0.75
\`\`\``,
    ],
  },
};
