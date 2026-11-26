/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { renderRound, roundEvidenceSchema } from '../../render_round';
import { runJudge } from '../../run_judge';
import { EVIDENCE_FAMILIES, familyListText } from '../families';
import {
  RECOVERY_EVIDENCE_FAMILIES_TOOL_NAME,
  queriedFamilies,
  recoveryEvidenceFamiliesOutputSchema,
  recoveryEvidenceFamiliesPrompt,
} from './prompt';

export const RECOVERY_EVIDENCE_FAMILIES_SCORE = 'recovery_evidence_families';

export const recoveryEvidenceFamiliesJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_recovery_evidence_families',
  version: '2.1.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    'Reference-free: how many kinds of data a recovery round actually queried (alert documents, rule event log, APM metrics and traces, service logs, remote clusters, chat records, source code, memory), judged from what each tool call targeted. A round with no tool calls scores 0.',
  evidenceSchema: roundEvidenceSchema,
  async evaluate({ round, inferenceClient }) {
    if (round.steps.length === 0) {
      return {
        scores: [
          {
            name: RECOVERY_EVIDENCE_FAMILIES_SCORE,
            score: 0,
            label: `0/${EVIDENCE_FAMILIES.length} families`,
            explanation: 'The round made no tool calls.',
            metadata: { tags: [] },
          },
        ],
      };
    }
    if (!inferenceClient) {
      throw new Error(
        'Inference client is required for the nightshift_recovery_evidence_families judge'
      );
    }
    const output = await runJudge({
      inferenceClient,
      prompt: recoveryEvidenceFamiliesPrompt,
      input: { family_list: familyListText(), transcript: renderRound(round) },
      toolName: RECOVERY_EVIDENCE_FAMILIES_TOOL_NAME,
      outputSchema: recoveryEvidenceFamiliesOutputSchema,
    });
    const reached = queriedFamilies(output, EVIDENCE_FAMILIES, round.steps.length);

    return {
      scores: [
        {
          name: RECOVERY_EVIDENCE_FAMILIES_SCORE,
          score: reached.length / EVIDENCE_FAMILIES.length,
          label: `${reached.length}/${EVIDENCE_FAMILIES.length} families`,
          explanation: `Queried: ${reached.join(', ') || 'none'}.`,
          metadata: { tags: reached.map((family) => `family:${family}`) },
        },
      ],
    };
  },
};
