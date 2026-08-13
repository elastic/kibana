/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import type { Evaluator } from '@kbn/evals';
import type { LeadGenerationDatasetExample, LeadGenerationTaskOutput } from '../types';
import { LeadGenerationRubricPrompt } from './lead_generation_rubric_prompt';

export const createLeadGenerationRubricEvaluator = ({
  inferenceClient,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): Evaluator<LeadGenerationDatasetExample, LeadGenerationTaskOutput> => ({
  name: 'LeadGenerationRubric',
  kind: 'LLM',
  evaluate: async ({ output, expected }) => {
    const errors = (output as LeadGenerationTaskOutput | undefined)?.errors;
    if (errors && errors.length > 0) {
      return {
        score: 0,
        label: 'task_error',
        explanation: String(errors[0]).slice(0, 1000),
      };
    }

    const leads = (output as LeadGenerationTaskOutput | undefined)?.leads ?? null;
    if (!leads) {
      return {
        score: 0,
        label: 'missing_leads',
        explanation: 'Lead generation pipeline did not produce a leads array.',
      };
    }

    if (leads.length === 0) {
      return {
        score: 1,
        label: 'ok_no_leads',
        explanation:
          'Pipeline ran successfully but produced no leads — likely no qualifying entities in the environment.',
      };
    }

    const submission = JSON.stringify({ leads }, null, 2);
    const reference = JSON.stringify({ leads: expected?.leads ?? [] }, null, 2);

    const response = await executeUntilValid({
      prompt: LeadGenerationRubricPrompt,
      inferenceClient,
      input: { submission, reference },
      finalToolChoice: {
        function: 'grade',
      } as ToolChoice<'grade'>,
      maxRetries: 3,
      toolCallbacks: {
        grade: async (toolCall) => ({
          response: toolCall.function.arguments,
        }),
      },
    });

    const toolCall = response.toolCalls[0];
    const args = toolCall?.function.arguments as
      | { verdict: 'Y' | 'N'; explanation: string }
      | undefined;

    if (!args) {
      throw new Error('Missing grade tool call from rubric evaluator');
    }

    log.info(`[LeadGenerationRubricEvaluator] verdict=${args.verdict}`);

    return {
      score: args.verdict === 'Y' ? 1 : 0,
      label: args.verdict,
      explanation: args.explanation,
    };
  },
});
