/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { DefaultEvaluators, KibanaPhoenixClient, EvaluationDataset } from '@kbn/evals';
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
      const result = await evaluators
        .criteria(criteria)
        .evaluate({ input, expected, output, metadata });

      return result;
    },
  };
}
