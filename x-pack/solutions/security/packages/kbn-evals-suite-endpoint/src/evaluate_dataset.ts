/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentBuilderClient,
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  EvalsExecutorClient,
  Example,
} from '@kbn/evals';
import type { EndpointResponseActionsRouting } from './endpoint_response_actions_routing_evaluator';
import { converseQuestionToTaskOutput } from './converse_task';

export interface SecurityDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
    /** Optional deterministic routing contract enforced by extra evaluators. */
    routing?: EndpointResponseActionsRouting;
    required_tool?: string;
  };
}

export type EvaluateSecurityDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: SecurityDatasetExample[];
  };
  extraEvaluators?: Evaluator[];
}) => Promise<void>;

export function createEndpointCriteriaEvaluator({
  evaluators,
}: {
  evaluators: DefaultEvaluators;
}): Evaluator {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    direction: 'maximize',
    evaluate: async ({ expected, ...rest }) => {
      const criteria: string[] = (expected as SecurityDatasetExample['output'])?.criteria ?? [];
      return evaluators.criteria(criteria).evaluate({ expected, ...rest });
    },
  };
}

export function createEvaluateSecurityDataset({
  evaluators,
  executorClient,
  agentBuilderClient,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  agentBuilderClient: AgentBuilderClient;
}): EvaluateSecurityDataset {
  return async function evaluateSecurityDataset({
    dataset: { name, description, examples },
    extraEvaluators = [],
  }: {
    dataset: {
      name: string;
      description: string;
      examples: SecurityDatasetExample[];
    };
    extraEvaluators?: Evaluator[];
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    await executorClient.runExperiment(
      {
        datasets: [dataset],
        task: async ({ input }) => converseQuestionToTaskOutput(agentBuilderClient, input.question),
      },
      [createEndpointCriteriaEvaluator({ evaluators }), ...extraEvaluators]
    );
  };
}
