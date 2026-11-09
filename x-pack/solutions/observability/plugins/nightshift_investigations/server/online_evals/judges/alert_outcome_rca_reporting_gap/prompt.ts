/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_JUDGE_TEXT_LENGTH } from '../alert_outcome_shared';
import { gradeSchema } from '../run_judge';
import systemPromptText from './system_prompt.text';

export const ALERT_OUTCOME_RCA_REPORTING_GAP_TOOL_NAME = 'score_alert_outcome_reporting_gap';

export const alertOutcomeRcaReportingGapOutputSchema = lazySchema(() =>
  z.object({
    ground_truth_has_verified_cause: z.boolean(),
    cause_in_transcript: gradeSchema,
    cause_in_report: gradeSchema,
    transcript_only_signals: z.string().max(MAX_JUDGE_TEXT_LENGTH).default(''),
    reasoning: z.string().max(MAX_JUDGE_TEXT_LENGTH),
  })
);

export type AlertOutcomeRcaReportingGapOutput = z.infer<
  typeof alertOutcomeRcaReportingGapOutputSchema
>;

export const alertOutcomeRcaReportingGapPrompt = createPrompt({
  name: 'nightshift_alert_outcome_rca_reporting_gap',
  description:
    "Grades whether a Nightshift investigation's report stated the confirmed root cause as strongly as its tool calls showed it",
  input: lazySchema(() =>
    z.object({
      confirmed_root_cause: z.string().max(MAX_JUDGE_TEXT_LENGTH),
      investigation_transcript: z.string(),
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
          'Confirmed root cause (ground truth):\n{{{confirmed_root_cause}}}\n\nInvestigation transcript (tool calls, results, reasoning):\n{{{investigation_transcript}}}\n\nFinal RCA report:\n{{{investigation_report}}}',
      },
    },
    tools: {
      [ALERT_OUTCOME_RCA_REPORTING_GAP_TOOL_NAME]: {
        description: 'Return the alert-outcome RCA reporting gap grades for the investigation.',
        schema: {
          type: 'object',
          properties: {
            ground_truth_has_verified_cause: {
              type: 'boolean',
              description: 'Does the confirmed root cause state a specific verified cause?',
            },
            cause_in_transcript: {
              type: 'number',
              description:
                '0-3: how strongly the investigation transcript evidences the confirmed cause.',
            },
            cause_in_report: {
              type: 'number',
              description: '0-3: how strongly the final report states the confirmed cause.',
            },
            transcript_only_signals: {
              type: 'string',
              description:
                'Signals/conclusion present in the transcript but omitted from the report (empty if none).',
            },
            reasoning: {
              type: 'string',
              description: 'One-to-two sentence justification.',
            },
          },
          required: [
            'ground_truth_has_verified_cause',
            'cause_in_transcript',
            'cause_in_report',
            'transcript_only_signals',
            'reasoning',
          ],
        },
      },
    },
  } as const)
  .get();
