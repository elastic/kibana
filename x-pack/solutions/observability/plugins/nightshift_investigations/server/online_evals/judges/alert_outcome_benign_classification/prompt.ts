/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_JUDGE_TEXT_LENGTH } from '../alert_outcome_shared';
import systemPromptText from './system_prompt.text';

export const ALERT_OUTCOME_BENIGN_CLASSIFICATION_TOOL_NAME = 'score_alert_outcome_benign';

export const alertOutcomeBenignClassificationOutputSchema = lazySchema(() =>
  z.object({
    ground_truth_severity_determined: z.boolean(),
    ground_truth_benign: z.boolean(),
    report_claims_benign: z.boolean(),
    report_escalates: z.boolean(),
    reasoning: z.string().max(MAX_JUDGE_TEXT_LENGTH),
  })
);

export type AlertOutcomeBenignClassificationOutput = z.infer<
  typeof alertOutcomeBenignClassificationOutputSchema
>;

export const alertOutcomeBenignClassificationPrompt = createPrompt({
  name: 'nightshift_alert_outcome_benign_classification',
  description:
    'Grades whether a Nightshift investigation classified its alert as benign or actionable the way its recovery confirmed',
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
          "Confirmed outcome (ground truth):\n{{{confirmed_root_cause}}}\n\nAI agent's RCA report:\n{{{investigation_report}}}",
      },
    },
    tools: {
      [ALERT_OUTCOME_BENIGN_CLASSIFICATION_TOOL_NAME]: {
        description: 'Return the alert-outcome benign classification for the report.',
        schema: {
          type: 'object',
          properties: {
            ground_truth_severity_determined: {
              type: 'boolean',
              description:
                'Does the confirmed outcome settle whether the alert was benign or needed remediation?',
            },
            ground_truth_benign: {
              type: 'boolean',
              description: 'Is the confirmed outcome benign / self-resolved / no-action?',
            },
            report_claims_benign: {
              type: 'boolean',
              description: 'Does the report conclude benign / no action needed?',
            },
            report_escalates: {
              type: 'boolean',
              description: 'Does the report recommend escalation or remediation?',
            },
            reasoning: {
              type: 'string',
              description: 'One-to-two sentence justification.',
            },
          },
          required: [
            'ground_truth_severity_determined',
            'ground_truth_benign',
            'report_claims_benign',
            'report_escalates',
            'reasoning',
          ],
        },
      },
    },
  } as const)
  .get();
