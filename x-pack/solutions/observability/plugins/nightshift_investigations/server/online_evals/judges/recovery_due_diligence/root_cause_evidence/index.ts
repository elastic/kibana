/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { renderRound, roundEvidenceSchema } from '../../render_round';
import {
  recoveryReferenceDataSchema,
  renderEarlierRounds,
  type RecoveryReferenceData,
} from '../reference_data';
import { capExplanation, runJudge } from '../../run_judge';
import {
  RECOVERY_ROOT_CAUSE_TOOL_NAME,
  recoveryRootCauseOutputSchema,
  recoveryRootCausePrompt,
} from './prompt';

/** The evidence level as a keyword, so a dashboard can count how often each level occurs. */
export const evidenceLevel = (value: number): 'evidenced' | 'partial' | 'none' =>
  value >= 1 ? 'evidenced' : value > 0 ? 'partial' : 'none';

const definition: RegisteredEvaluatorDefinition<RecoveryReferenceData> = {
  name: 'nightshift_recovery_root_cause_evidence',
  version: '1.2.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    'Reference-free: whether an alert-recovery round backed the failure mechanism and the reason the alert closed with tool results, rather than asserting them, and whether it stated anything no source contains. Facts from the recovery request and from the tool results of earlier rounds count as supported. Scores the recovery round itself, not the first round.',
  evidenceSchema: roundEvidenceSchema,
  referenceDataSchema: recoveryReferenceDataSchema,
  async evaluate({ round, referenceData, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error(
        'Inference client is required for the nightshift_recovery_root_cause_evidence judge'
      );
    }
    const output = await runJudge({
      inferenceClient,
      prompt: recoveryRootCausePrompt,
      input: {
        earlier_context: renderEarlierRounds(referenceData?.earlier_rounds),
        transcript: renderRound(round),
      },
      toolName: RECOVERY_ROOT_CAUSE_TOOL_NAME,
      outputSchema: recoveryRootCauseOutputSchema,
    });
    const mechanism = output.mechanism_evidenced;
    const closure = output.closure_evidenced;

    return {
      scores: [
        {
          name: 'recovery_mechanism_evidenced',
          score: mechanism,
          label: evidenceLevel(mechanism),
          explanation: capExplanation(output.mechanism_claim || 'none'),
          metadata: { tags: [`mechanism:${evidenceLevel(mechanism)}`] },
        },
        {
          name: 'recovery_closure_evidenced',
          score: closure,
          label: evidenceLevel(closure),
          explanation: capExplanation(output.closure_claim || 'none'),
          metadata: { tags: [`closure:${evidenceLevel(closure)}`] },
        },
        {
          name: 'recovery_no_unsupported_claim',
          score: output.unsupported_claim ? 0 : 1,
          label: `unsupported_claim=${output.unsupported_claim}`,
          explanation: capExplanation(output.reasoning),
          metadata: { tags: [`unsupported_claim:${output.unsupported_claim}`] },
        },
      ],
    };
  },
};

export const recoveryRootCauseEvidenceJudge: RegisteredEvaluatorDefinition = definition;
