/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorResult, RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import type { AlertOutcomeReferenceData } from '../alert_outcome_shared';
import { MAX_JUDGE_INPUT_CHARS, alertOutcomeReferenceDataSchema } from '../alert_outcome_shared';
import { roundEvidenceSchema, truncate } from '../render_round';
import { capExplanation, runJudge } from '../run_judge';
import type { AlertOutcomeBenignClassificationOutput } from './prompt';
import {
  ALERT_OUTCOME_BENIGN_CLASSIFICATION_TOOL_NAME,
  alertOutcomeBenignClassificationOutputSchema,
  alertOutcomeBenignClassificationPrompt,
} from './prompt';

type ClassificationInput = Pick<
  AlertOutcomeBenignClassificationOutput,
  'ground_truth_benign' | 'report_claims_benign' | 'report_escalates'
>;

/**
 * Ports Deductive's `classification_correct`: the report's benign stance matches the outcome.
 * An uncommitted report on an actionable outcome still passes; pair with RCA accuracy.
 */
export const isClassificationCorrect = ({
  ground_truth_benign: groundTruthBenign,
  report_claims_benign: reportClaimsBenign,
}: ClassificationInput): boolean => reportClaimsBenign === groundTruthBenign;

/** Ports Deductive's `is_false_escalation`: a benign outcome was escalated. */
export const isFalseEscalation = ({
  ground_truth_benign: groundTruthBenign,
  report_escalates: reportEscalates,
}: ClassificationInput): boolean => groundTruthBenign && reportEscalates;

/** Ports Deductive's `is_false_dismissal`: an actionable outcome was dismissed as benign. */
export const isFalseDismissal = ({
  ground_truth_benign: groundTruthBenign,
  report_claims_benign: reportClaimsBenign,
}: ClassificationInput): boolean => !groundTruthBenign && reportClaimsBenign;

const toScores = (output: AlertOutcomeBenignClassificationOutput): EvaluatorResult['scores'] => {
  const {
    ground_truth_benign: groundTruthBenign,
    report_claims_benign: reportClaimsBenign,
    report_escalates: reportEscalates,
    reasoning,
  } = output;
  const correct = isClassificationCorrect(output);
  const falseEscalation = isFalseEscalation(output);
  const falseDismissal = isFalseDismissal(output);
  const explanation = capExplanation(reasoning);

  return [
    {
      name: 'alert_outcome_benign_classification_correct',
      score: correct ? 1 : 0,
      label: `gt_benign=${groundTruthBenign} report_benign=${reportClaimsBenign} report_escalates=${reportEscalates}`,
      explanation,
    },
    {
      name: 'alert_outcome_no_false_escalation',
      score: falseEscalation ? 0 : 1,
      label: `false_escalation=${falseEscalation}`,
      explanation,
    },
    {
      name: 'alert_outcome_no_false_dismissal',
      score: falseDismissal ? 0 : 1,
      label: `false_dismissal=${falseDismissal}`,
      explanation,
    },
  ];
};

const definition: RegisteredEvaluatorDefinition<AlertOutcomeReferenceData> = {
  name: 'nightshift_alert_outcome_benign_classification',
  version: '1.0.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    "Reference-based: whether an investigation's first-round report took the same benign stance as the confirmed outcome. 1 means the report's benign/not-benign call matches the outcome. A report that never calls an alert benign scores 1 on every actionable alert even if it commits to no cause, so read it alongside nightshift_alert_outcome_rca_accuracy.",
  evidenceSchema: roundEvidenceSchema,
  referenceDataSchema: alertOutcomeReferenceDataSchema,
  async evaluate({ round, referenceData, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error(
        'Inference client is required for the nightshift_alert_outcome_benign_classification judge'
      );
    }

    const confirmedOutcome = referenceData?.alert_outcome ?? '';
    if (!confirmedOutcome.trim()) {
      return { scores: [], notApplicable: { reason: 'no confirmed outcome' } };
    }

    const output = await runJudge({
      inferenceClient,
      prompt: alertOutcomeBenignClassificationPrompt,
      input: {
        confirmed_root_cause: truncate(confirmedOutcome, MAX_JUDGE_INPUT_CHARS),
        investigation_report: truncate(round.response.message, MAX_JUDGE_INPUT_CHARS),
      },
      toolName: ALERT_OUTCOME_BENIGN_CLASSIFICATION_TOOL_NAME,
      outputSchema: alertOutcomeBenignClassificationOutputSchema,
    });

    if (!output.ground_truth_severity_determined) {
      return { scores: [], notApplicable: { reason: 'recovery states no severity' } };
    }

    return { scores: toScores(output) };
  },
};

export const alertOutcomeBenignClassificationJudge: RegisteredEvaluatorDefinition = definition;
