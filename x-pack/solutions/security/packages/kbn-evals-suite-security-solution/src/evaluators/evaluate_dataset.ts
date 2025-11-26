/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
  type DefaultEvaluators,
  type EvaluationDataset,
  type KibanaPhoenixClient,
} from '@kbn/evals';
import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { SecurityAIAssistantEvaluationChatClient } from '../clients';

interface SecurityDatasetExample extends Example {
  input: { question: string };
  output: { reference?: string; criteria: string[] };
}

/**
 * Creates an LLM-as-a-judge criteria evaluator that can be used across all evaluation scenarios.
 * This provides a standardized evaluator with a consistent name "Criteria".
 * Criteria are extracted from expected.criteria in the dataset examples.
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
      input: Record<string, unknown>;
      output: Record<string, unknown>;
      expected?: { criteria?: string[] };
      metadata?: Record<string, unknown> | null;
    }) => {
      const criteria = expected?.criteria ?? [];
      const result = await evaluators.criteria(criteria).evaluate({
        input,
        expected,
        output,
        metadata,
      });

      return result;
    },
  };
}

export type EvaluateSecurityDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: SecurityDatasetExample[];
  };
}) => Promise<void>;

export function createEvaluateSecurityDataset({
  evaluators,
  phoenixClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: SecurityAIAssistantEvaluationChatClient;
}): EvaluateSecurityDataset {
  return async function evaluateSecurityDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: SecurityDatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    /**
     * We're still defaulting our reporting to criteria only. Correctness and groundedness don't work reliably with our
     * current LLM judge of choice (Gemini 2.5 Pro), causing timeouts and occasional malformed tool calls.
     */
    const useQualitativeEvaluators = process.env.USE_QUALITATIVE_EVALUATORS === 'true';

    await phoenixClient.runExperiment(
      {
        dataset,
        task: async ({ input, output, metadata }) => {
          const response = await chatClient.complete({ messages: input.question });

          // Extract the last message content for evaluation
          const lastMessage = response.messages[response.messages.length - 1];
          const responseText = lastMessage?.content ?? '';

          const result: Record<string, unknown> = {
            errors: response.errors,
            messages: response.messages,
            response: responseText,
          };

          if (useQualitativeEvaluators) {
            const qualitativeAnalysisInput = {
              input,
              expected: {
                expected: output.reference ?? output.criteria?.join('\n') ?? '',
              },
              output: {
                messages: [lastMessage].map((m) => ({
                  message: m?.content ?? '',
                })),
                steps: response.messages,
              },
              metadata,
            };
            const [correctnessResult, groundednessResult] = await Promise.all([
              evaluators.correctnessAnalysis().evaluate(qualitativeAnalysisInput),
              evaluators.groundednessAnalysis().evaluate(qualitativeAnalysisInput),
            ]);

            if (correctnessResult?.metadata)
              result.correctnessAnalysis = correctnessResult.metadata;
            if (groundednessResult?.metadata)
              result.groundednessAnalysis = groundednessResult.metadata;
          }

          return result;
        },
      },
      [
        createCriteriaEvaluator({
          evaluators,
        }),
        ...(useQualitativeEvaluators
          ? [
              createQuantitativeGroundednessEvaluator(),
              ...createQuantitativeCorrectnessEvaluators(),
            ]
          : []),
      ]
    );
  };
}
