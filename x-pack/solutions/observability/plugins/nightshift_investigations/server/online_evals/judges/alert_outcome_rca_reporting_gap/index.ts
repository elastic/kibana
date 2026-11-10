/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import type { EvaluatorResult, RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_JUDGE_INPUT_CHARS, alertOutcomeReferenceDataSchema } from '../alert_outcome_shared';
import { isEvidenceToolCall } from '../../../investigation_round';
import {
  MAX_TOOL_FIELD_CHARS,
  renderTraceMessages,
  roundEvidenceSchema,
  truncate,
} from '../render_round';
import { capExplanation, gradeToScore, runConversationJudge } from '../run_judge';
import type { AlertOutcomeRcaReportingGapOutput } from './prompt';
import {
  ALERT_OUTCOME_RCA_REPORTING_GAP_SYSTEM_PROMPT,
  alertOutcomeRcaReportingGapOutputSchema,
  alertOutcomeRcaReportingGapTool,
  buildScoringRequest,
} from './prompt';

// Unbounded like `alert_outcome`; `evaluate` truncates it.
const referenceDataSchema = lazySchema(() =>
  alertOutcomeReferenceDataSchema.extend({
    /** The agent's notes after its last tool call, where it concludes before writing the report. */
    closing_reasoning: z.string().optional(),
  })
);

type ReferenceData = z.infer<typeof referenceDataSchema>;

/** The transcript grade from which the cause counts as found during the investigation. */
export const TRANSCRIPT_PRESENT_FLOOR = 2;
/** The report grade at or below which the report shows only the symptom or nothing. */
export const REPORT_ABSENT_CEILING = 1;

/**
 * Ports Deductive's `is_reporting_gap`: the transcript points at the confirmed cause and the
 * report drops it to the symptom or nothing.
 */
export const isReportingGap = ({
  cause_in_transcript: causeInTranscript,
  cause_in_report: causeInReport,
}: Pick<AlertOutcomeRcaReportingGapOutput, 'cause_in_transcript' | 'cause_in_report'>): boolean =>
  causeInTranscript >= TRANSCRIPT_PRESENT_FLOOR && causeInReport <= REPORT_ABSENT_CEILING;

const toScores = (output: AlertOutcomeRcaReportingGapOutput): EvaluatorResult['scores'] => {
  const {
    cause_in_transcript: causeInTranscript,
    cause_in_report: causeInReport,
    transcript_only_signals: transcriptOnlySignals,
    reasoning,
  } = output;
  const gap = isReportingGap(output);

  return [
    {
      name: 'alert_outcome_rca_found_in_transcript',
      score: gradeToScore(causeInTranscript),
      label: `transcript=${causeInTranscript}/3 report=${causeInReport}/3`,
      explanation: capExplanation(reasoning),
    },
    {
      name: 'alert_outcome_rca_no_reporting_gap',
      score: gap ? 0 : 1,
      label: `gap=${gap}`,
      explanation: capExplanation(transcriptOnlySignals || 'none'),
    },
  ];
};

const definition: RegisteredEvaluatorDefinition<ReferenceData> = {
  name: 'nightshift_alert_outcome_rca_reporting_gap',
  version: '1.0.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    "Reference-based: whether an investigation's first-round report stated the confirmed cause as strongly as its tool calls showed it. alert_outcome_rca_no_reporting_gap is 0 when the transcript points at the confirmed cause (2+ of 3) and the report shows only the symptom or nothing (1 or less).",
  evidenceSchema: roundEvidenceSchema,
  referenceDataSchema,
  async evaluate({ round, referenceData, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error(
        'Inference client is required for the nightshift_alert_outcome_rca_reporting_gap judge'
      );
    }

    const confirmedRootCause = referenceData?.alert_outcome ?? '';
    if (!confirmedRootCause.trim()) {
      return { scores: [], notApplicable: { reason: 'no confirmed cause' } };
    }

    // The transcript is the evidence the agent gathered: skip its own recording tools and reads of
    // Nightshift-seeded files (wiki, memories, decision trees), which aren't investigation evidence.
    const evidenceSteps = round.steps.filter(({ tool_id: toolId, arguments: args }) =>
      isEvidenceToolCall(
        toolId,
        typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : undefined
      )
    );
    if (evidenceSteps.length === 0) {
      return { scores: [], notApplicable: { reason: 'no investigation transcript' } };
    }

    const { messages, omittedToolCalls } = renderTraceMessages(
      { ...round, steps: evidenceSteps },
      { includeFinalAnswer: false }
    );
    const closingReasoning = referenceData?.closing_reasoning?.trim();
    if (closingReasoning) {
      messages.push({
        role: MessageRole.Assistant,
        content: truncate(closingReasoning, MAX_TOOL_FIELD_CHARS),
      });
    }
    const output = await runConversationJudge({
      inferenceClient,
      system: ALERT_OUTCOME_RCA_REPORTING_GAP_SYSTEM_PROMPT,
      messages: [
        ...messages,
        {
          role: MessageRole.User,
          content: buildScoringRequest({
            confirmedRootCause: truncate(confirmedRootCause, MAX_JUDGE_INPUT_CHARS),
            investigationReport: truncate(round.response.message, MAX_JUDGE_INPUT_CHARS),
            omittedToolCalls,
          }),
        },
      ],
      tool: alertOutcomeRcaReportingGapTool,
      outputSchema: alertOutcomeRcaReportingGapOutputSchema,
    });

    if (!output.ground_truth_has_verified_cause) {
      return { scores: [], notApplicable: { reason: 'recovery states no verified cause' } };
    }

    return { scores: toScores(output) };
  },
};

export const alertOutcomeRcaReportingGapJudge: RegisteredEvaluatorDefinition = definition;
