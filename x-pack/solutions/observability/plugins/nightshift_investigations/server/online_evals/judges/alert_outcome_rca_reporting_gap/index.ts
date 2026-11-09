/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorResult, RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import type { AlertOutcomeReferenceData } from '../alert_outcome_shared';
import { MAX_JUDGE_INPUT_CHARS, alertOutcomeReferenceDataSchema } from '../alert_outcome_shared';
import { renderTranscript, roundEvidenceSchema, truncate } from '../render_round';
import { capExplanation, gradeToScore, runJudge } from '../run_judge';
import type { AlertOutcomeRcaReportingGapOutput } from './prompt';
import {
  ALERT_OUTCOME_RCA_REPORTING_GAP_TOOL_NAME,
  alertOutcomeRcaReportingGapOutputSchema,
  alertOutcomeRcaReportingGapPrompt,
} from './prompt';

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
      explanation: capExplanation(transcriptOnlySignals || reasoning),
    },
  ];
};

const definition: RegisteredEvaluatorDefinition<AlertOutcomeReferenceData> = {
  name: 'nightshift_alert_outcome_rca_reporting_gap',
  version: '1.0.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    "Reference-based: whether an investigation's first-round report stated the confirmed cause as strongly as its tool calls showed it. alert_outcome_rca_no_reporting_gap is 0 when the transcript points at the confirmed cause (2+ of 3) and the report shows only the symptom or nothing (1 or less).",
  evidenceSchema: roundEvidenceSchema,
  referenceDataSchema: alertOutcomeReferenceDataSchema,
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

    if (round.steps.length === 0) {
      return { scores: [], notApplicable: { reason: 'no investigation transcript' } };
    }

    const output = await runJudge({
      inferenceClient,
      prompt: alertOutcomeRcaReportingGapPrompt,
      input: {
        confirmed_root_cause: truncate(confirmedRootCause, MAX_JUDGE_INPUT_CHARS),
        investigation_transcript: renderTranscript(round),
        investigation_report: truncate(round.response.message, MAX_JUDGE_INPUT_CHARS),
      },
      toolName: ALERT_OUTCOME_RCA_REPORTING_GAP_TOOL_NAME,
      outputSchema: alertOutcomeRcaReportingGapOutputSchema,
    });

    if (!output.ground_truth_has_verified_cause) {
      return { scores: [], notApplicable: { reason: 'recovery states no verified cause' } };
    }

    return { scores: toScores(output) };
  },
};

export const alertOutcomeRcaReportingGapJudge: RegisteredEvaluatorDefinition = definition;
