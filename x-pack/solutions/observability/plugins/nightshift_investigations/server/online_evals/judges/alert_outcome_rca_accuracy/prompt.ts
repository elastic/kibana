/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { gradeSchema } from '../run_judge';
import systemPromptText from './system_prompt.text';

export const ALERT_OUTCOME_RCA_ACCURACY_TOOL_NAME = 'score_alert_outcome_rca';

/** Generous bound on judge text; explanations are capped separately before persisting. */
const MAX_JUDGE_TEXT_LENGTH = 100_000;

/** The judge cuts each input to this length, below the prompt bound so the truncation marker fits. */
export const MAX_JUDGE_INPUT_CHARS = 90_000;

export const alertOutcomeRcaAccuracyOutputSchema = lazySchema(() =>
  z.object({
    ground_truth_has_verified_cause: z.boolean(),
    root_cause_match: z.boolean(),
    mechanism_match: z.boolean(),
    evidence_match: z.boolean(),
    score: gradeSchema,
    materially_wrong_claim: z.boolean(),
    offending_claim: z.string().max(MAX_JUDGE_TEXT_LENGTH).default(''),
    reasoning: z.string().max(MAX_JUDGE_TEXT_LENGTH),
  })
);

export type AlertOutcomeRcaAccuracyOutput = z.infer<typeof alertOutcomeRcaAccuracyOutputSchema>;

export const alertOutcomeRcaAccuracyPrompt = createPrompt({
  name: 'nightshift_alert_outcome_rca_accuracy',
  description:
    "Grades a Nightshift investigation's conclusion against the root cause confirmed when its alert recovered",
  input: lazySchema(() =>
    z.object({
      confirmed_root_cause: z.string().max(MAX_JUDGE_TEXT_LENGTH),
      investigation_report: z.string().max(MAX_JUDGE_TEXT_LENGTH),
    })
  ),
})
  .version({
    system: {
      mustache: {
        template: systemPromptText,
      },
    },
    template: {
      mustache: {
        template:
          "Confirmed root cause (ground truth):\n{{{confirmed_root_cause}}}\n\nAI agent's incident RCA report:\n{{{investigation_report}}}",
      },
    },
    tools: {
      [ALERT_OUTCOME_RCA_ACCURACY_TOOL_NAME]: {
        description: 'Return the alert-outcome RCA accuracy grade for the report.',
        schema: {
          type: 'object',
          properties: {
            ground_truth_has_verified_cause: {
              type: 'boolean',
              description: 'Does the confirmed root cause state a specific verified cause?',
            },
            root_cause_match: {
              type: 'boolean',
              description: 'Did the report identify the confirmed root cause?',
            },
            mechanism_match: {
              type: 'boolean',
              description: 'Did the report correctly explain the confirmed mechanism?',
            },
            evidence_match: {
              type: 'boolean',
              description:
                'Did the report cite concrete supporting signals (metrics/logs/traces/timestamps) for the cause?',
            },
            score: {
              type: 'number',
              description: 'Per-rubric 0-3 score on the ORCA scale (before the penalty).',
            },
            materially_wrong_claim: {
              type: 'boolean',
              description:
                'True if the report makes a materially wrong / misleading claim (triggers the -1 penalty).',
            },
            offending_claim: {
              type: 'string',
              description:
                'The specific wrong claim (quote/paraphrase); required when materially_wrong_claim is true.',
            },
            reasoning: {
              type: 'string',
              description: 'One-to-two sentence justification for the score.',
            },
          },
          required: [
            'ground_truth_has_verified_cause',
            'root_cause_match',
            'mechanism_match',
            'evidence_match',
            'score',
            'materially_wrong_claim',
            'reasoning',
          ],
        },
      },
    },
  } as const)
  .get();
