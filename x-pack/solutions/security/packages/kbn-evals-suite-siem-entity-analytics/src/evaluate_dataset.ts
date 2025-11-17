/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { DefaultEvaluators, KibanaPhoenixClient, EvaluationDataset } from '@kbn/evals';
import type { EvaluationResult } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type {
  SiemEntityAnalyticsEvaluationChatClient,
  ErrorResponse,
  Step,
  Messages,
} from './chat_client';

interface DatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
  };
  metadata?: {
    query_intent?: string;
    toolId?: string;
    [key: string]: unknown;
  };
}

/**
 * Task output for SIEM Entity Analytics chat evaluations.
 * Satisfies Phoenix's TaskOutput type (string | boolean | number | object | null).
 */
interface ChatTaskOutput {
  errors: ErrorResponse[];
  messages: Messages;
  steps?: Step[];
}

export type EvaluateDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: DatasetExample[];
  };
}) => Promise<void>;

/**
 * Checks if a tool was called during the conversation and combines the result with criteria evaluation.
 * @param toolId - The tool ID to check for
 * @param steps - The conversation steps to search for tool calls
 * @param criteriaResult - The result from criteria evaluation
 * @returns Combined evaluation result with tool call check
 */
function checkToolCallAndCombineResults(
  toolId: string,
  steps: Step[],
  criteriaResult: EvaluationResult
): EvaluationResult {
  const toolWasCalled = steps.some(
    (step) =>
      (step as { type?: string; tool_id?: string }).type === 'tool_call' &&
      (step as { type?: string; tool_id?: string }).tool_id === toolId
  );

  const toolCallExplanation = toolWasCalled
    ? `Tool "${toolId}" was called during the conversation.`
    : `Tool "${toolId}" was not called during the conversation.`;

  const combinedExplanation = `${criteriaResult.explanation ?? ''} ${toolCallExplanation}`;

  // If tool call failed, fail the overall evaluation
  if (!toolWasCalled) {
    return {
      score: 0,
      label: 'FAIL',
      explanation: combinedExplanation,
    };
  }

  // Tool call passed, return criteria result with combined explanation
  return {
    score: criteriaResult.score ?? null,
    label: criteriaResult.label ?? 'PASS',
    explanation: combinedExplanation,
  };
}

export function createEvaluateDataset({
  evaluators,
  phoenixClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: SiemEntityAnalyticsEvaluationChatClient;
}): EvaluateDataset {
  return async function evaluateDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    await phoenixClient.runExperiment(
      {
        dataset,
        task: async ({ input }) => {
          const response = await chatClient.converse({
            messages: [{ message: input.question }],
          });

          return {
            errors: response.errors,
            messages: response.messages,
            steps: response.steps,
          };
        },
      },
      [
        createCriteriaEvaluator({
          evaluators,
        }),
      ]
    );
  };
}

/**
 * Common criteria evaluator that can be used across all evaluation scenarios.
 * This provides a standardized evaluator with a consistent name "Criteria".
 * It also checks tool calls if toolId is specified in the example metadata.
 */
export function createCriteriaEvaluator({ evaluators }: { evaluators: DefaultEvaluators }) {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    evaluate: async ({
      input,
      output,
      expected,
      metadata,
    }: {
      input: DatasetExample['input'];
      output: ChatTaskOutput;
      expected: DatasetExample['output'];
      metadata: DatasetExample['metadata'];
    }) => {
      const criteria = expected.criteria ?? [];
      const criteriaResult = await evaluators
        .criteria(criteria)
        .evaluate({ input, expected, output, metadata });

      // Check tool call if toolId is specified in metadata
      const toolId = metadata?.toolId;
      if (toolId && typeof toolId === 'string') {
        const steps = output.steps ?? [];
        return checkToolCallAndCombineResults(toolId, steps, criteriaResult);
      }

      // No toolId specified, return criteria result as-is
      return criteriaResult;
    },
  };
}
