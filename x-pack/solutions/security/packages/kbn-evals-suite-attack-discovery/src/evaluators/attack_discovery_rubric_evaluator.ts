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
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import { AttackDiscoveryRubricPrompt } from './attack_discovery_rubric_prompt';

export const createAttackDiscoveryRubricEvaluator = ({
  inferenceClient,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput> => {
  return {
    name: 'AttackDiscoveryRubric',
    kind: 'LLM',
    evaluate: async ({ output, expected }) => {
      const errors = (output as AttackDiscoveryTaskOutput | undefined)?.errors;
      if (errors && errors.length > 0) {
        return {
          score: 0,
          label: 'task_error',
          explanation: String(errors[0]).slice(0, 1000),
        };
      }

      const insights = (output as AttackDiscoveryTaskOutput | undefined)?.insights ?? null;
      if (!insights) {
        return {
          score: 0,
          label: 'missing_insights',
          explanation: 'Attack Discovery task did not produce insights.',
        };
      }

      const submission = JSON.stringify(
        {
          attackDiscoveries: insights,
        },
        null,
        2
      );

      const reference = JSON.stringify(
        {
          attackDiscoveries: expected?.attackDiscoveries ?? [],
        },
        null,
        2
      );

      const response = await executeUntilValid({
        prompt: AttackDiscoveryRubricPrompt,
        inferenceClient,
        input: {
          submission,
          reference,
        },
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
        throw new Error('Missing grade tool call');
      }

      return {
        score: args.verdict === 'Y' ? 1 : 0,
        label: args.verdict,
        explanation: args.explanation,
      };
    },
  };
};
