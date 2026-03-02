/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  EvalsExecutorClient,
  Example,
} from '@kbn/evals';
import type { SecurityEvalChatClient } from './chat_client';

export interface SecurityDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
  };
}

export type EvaluateSecurityDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: SecurityDatasetExample[];
  };
}) => Promise<void>;

export function createEndpointCriteriaEvaluator({
  evaluators,
}: {
  evaluators: DefaultEvaluators;
}): Evaluator {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    evaluate: async ({ expected, ...rest }) => {
      const criteria: string[] = (expected as SecurityDatasetExample['output'])?.criteria ?? [];
      return evaluators.criteria(criteria).evaluate({ expected, ...rest });
    },
  };
}

export function createEvaluateSecurityDataset({
  evaluators,
  executorClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: SecurityEvalChatClient;
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

    await executorClient.runExperiment(
      {
        dataset,
        task: async ({ input }) => {
          const response = await chatClient.converse({ message: input.question });

          return {
            messages: response.messages,
            steps: response.steps,
            errors: response.errors,
            traceId: response.traceId,
          };
        },
      },
      [createEndpointCriteriaEvaluator({ evaluators })]
    );
  };
}
