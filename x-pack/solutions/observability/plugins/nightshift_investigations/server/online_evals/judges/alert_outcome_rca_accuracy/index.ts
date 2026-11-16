/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorResult, RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import { roundEvidenceSchema, truncate } from '../render_round';
import { capExplanation, gradeToScore, runJudge } from '../run_judge';
import type { AlertOutcomeRcaAccuracyOutput } from './prompt';
import {
  ALERT_OUTCOME_RCA_ACCURACY_TOOL_NAME,
  MAX_JUDGE_INPUT_CHARS,
  alertOutcomeRcaAccuracyOutputSchema,
  alertOutcomeRcaAccuracyPrompt,
} from './prompt';

// Unbounded on purpose: the schema is checked for the whole evaluation, so a rejection here would
// fail every evaluator in the set. `evaluate` truncates instead.
const alertOutcomeReferenceDataSchema = lazySchema(() => z.object({ alert_outcome: z.string() }));

type AlertOutcomeReferenceData = z.infer<typeof alertOutcomeReferenceDataSchema>;

type PenaltyInput = Pick<
  AlertOutcomeRcaAccuracyOutput,
  | 'score'
  | 'root_cause_match'
  | 'mechanism_match'
  | 'evidence_match'
  | 'materially_wrong_claim'
  | 'offending_claim'
>;

const isHallucination = ({
  materially_wrong_claim: materiallyWrongClaim,
  offending_claim: offendingClaim,
}: Pick<PenaltyInput, 'materially_wrong_claim' | 'offending_claim'>): boolean =>
  materiallyWrongClaim && offendingClaim.trim().length > 0;

/**
 * Ports Deductive's `apply_penalty`: a 3 needs all three matches or drops to 2, and a named
 * materially wrong claim costs one point, with a floor of 0.
 */
export const applyPenalty = (result: PenaltyInput): number => {
  const { score, root_cause_match, mechanism_match, evidence_match } = result;
  const allMatch = root_cause_match && mechanism_match && evidence_match;
  const consistent = score >= 3 && !allMatch ? 2 : score;
  return isHallucination(result) ? Math.max(0, consistent - 1) : consistent;
};

const toScores = ({
  effective,
  hallucinated,
  reasoning,
  offendingClaim,
}: {
  effective: number;
  hallucinated: boolean;
  reasoning: string;
  offendingClaim: string;
}): EvaluatorResult['scores'] => [
  {
    name: 'alert_outcome_rca_depth',
    score: gradeToScore(effective),
    label: `score=${effective}/3`,
    explanation: capExplanation(reasoning),
  },
  {
    name: 'alert_outcome_rca_accuracy',
    score: effective >= 3 ? 1 : 0,
    label: `score=${effective}/3`,
    explanation: capExplanation(reasoning),
  },
  {
    name: 'alert_outcome_rca_no_hallucination',
    score: hallucinated ? 0 : 1,
    label: `hallucinated=${hallucinated}`,
    explanation: capExplanation(offendingClaim || 'none'),
  },
];

const definition: RegisteredEvaluatorDefinition<AlertOutcomeReferenceData> = {
  name: 'nightshift_alert_outcome_rca_accuracy',
  version: '1.0.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    "Reference-based: how well an investigation's first-round conclusion matches the cause confirmed when its alert recovered.",
  evidenceSchema: roundEvidenceSchema,
  referenceDataSchema: alertOutcomeReferenceDataSchema,
  async evaluate({ round, referenceData, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error(
        'Inference client is required for the nightshift_alert_outcome_rca_accuracy judge'
      );
    }

    const confirmedRootCause = referenceData?.alert_outcome ?? '';
    if (!confirmedRootCause.trim()) {
      return { scores: [], notApplicable: { reason: 'no confirmed cause' } };
    }

    const output = await runJudge({
      inferenceClient,
      prompt: alertOutcomeRcaAccuracyPrompt,
      input: {
        confirmed_root_cause: truncate(confirmedRootCause, MAX_JUDGE_INPUT_CHARS),
        investigation_report: truncate(round.response.message, MAX_JUDGE_INPUT_CHARS),
      },
      toolName: ALERT_OUTCOME_RCA_ACCURACY_TOOL_NAME,
      outputSchema: alertOutcomeRcaAccuracyOutputSchema,
    });

    if (!output.ground_truth_has_verified_cause) {
      return { scores: [], notApplicable: { reason: 'recovery states no verified cause' } };
    }

    return {
      scores: toScores({
        effective: applyPenalty(output),
        hallucinated: isHallucination(output),
        reasoning: output.reasoning,
        offendingClaim: output.offending_claim,
      }),
    };
  },
};

export const alertOutcomeRcaAccuracyJudge: RegisteredEvaluatorDefinition = definition;
