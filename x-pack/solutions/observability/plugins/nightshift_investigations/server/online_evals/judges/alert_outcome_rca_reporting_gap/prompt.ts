/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_JUDGE_TEXT_LENGTH } from '../alert_outcome_shared';
import { gradeSchema } from '../run_judge';
import { withIdentifierRule } from '../with_identifier_rule';
import systemPromptText from './system_prompt.text';

export const ALERT_OUTCOME_RCA_REPORTING_GAP_TOOL_NAME = 'score_alert_outcome_reporting_gap';

export const ALERT_OUTCOME_RCA_REPORTING_GAP_SYSTEM_PROMPT: string =
  withIdentifierRule(systemPromptText);

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

export const alertOutcomeRcaReportingGapTool: {
  name: string;
  description: string;
  schema: ToolSchema;
} = {
  name: ALERT_OUTCOME_RCA_REPORTING_GAP_TOOL_NAME,
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
          'Signals/conclusion present in the transcript but omitted from the report (empty if none). Describe them without naming hosts, people or IDs.',
      },
      reasoning: {
        type: 'string',
        description:
          'One-to-two sentence justification. Describe it without naming hosts, people or IDs.',
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
};

/**
 * The human message that closes the conversation: the confirmed cause and the final report to
 * grade against the transcript above, and the request to score them.
 */
export const buildScoringRequest = ({
  confirmedRootCause,
  investigationReport,
  omittedToolCalls,
}: {
  confirmedRootCause: string;
  investigationReport: string;
  omittedToolCalls: number;
}): string =>
  [
    'The conversation above is the investigation transcript to evaluate. It does not include the final report.',
    omittedToolCalls > 0
      ? `${omittedToolCalls} tool calls from the middle of the investigation were left out to fit your context.`
      : undefined,
    `Confirmed root cause (ground truth):\n${confirmedRootCause}`,
    `Final RCA report:\n${investigationReport}`,
    `Grade both by calling ${ALERT_OUTCOME_RCA_REPORTING_GAP_TOOL_NAME}.`,
  ]
    .filter((part): part is string => part !== undefined)
    .join('\n\n');
