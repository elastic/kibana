/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ReportReferenceData } from '../report';
import { renderReport, reportReferenceDataSchema } from '../report';
import { capExplanation, gradeToScore, runJudge } from '../run_judge';
import {
  CONCLUSION_QUALITY_TOOL_NAME,
  conclusionQualityOutputSchema,
  conclusionQualityPrompt,
} from './prompt';

const conclusionEvidenceSchema = lazySchema(() =>
  z.object({
    response: z.object({ message: z.string().trim().min(1) }),
  })
);

const definition: RegisteredEvaluatorDefinition<ReportReferenceData> = {
  name: 'nightshift_conclusion_quality',
  version: '1.0.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    "Reference-free: grades the root cause conclusion of a Nightshift investigation from the agent's final answer and hypotheses panel alone, without its tool calls.",
  evidenceSchema: conclusionEvidenceSchema,
  referenceDataSchema: reportReferenceDataSchema,
  async evaluate({ round, referenceData, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error('Inference client is required for the nightshift_conclusion_quality judge');
    }

    const output = await runJudge({
      inferenceClient,
      prompt: conclusionQualityPrompt,
      input: {
        answer: renderReport({
          answer: round.response.message,
          hypotheses: referenceData?.hypotheses,
        }),
      },
      toolName: CONCLUSION_QUALITY_TOOL_NAME,
      outputSchema: conclusionQualityOutputSchema,
    });

    return {
      scores: [
        {
          name: 'rca_conclusion_quality',
          score: gradeToScore(output.conclusion_quality),
          label: `${output.conclusion_quality}/3`,
          explanation: capExplanation(output.conclusion_reasoning),
        },
      ],
    };
  },
};

export const conclusionQualityJudge: RegisteredEvaluatorDefinition = definition;
