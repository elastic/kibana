/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  EvalsExecutorClient,
  Example,
  TaskOutput,
} from '@kbn/evals';
import {
  createShortestPathEvaluator,
  createTrajectoryEvaluator,
  getToolCallSteps,
} from '@kbn/evals';
import type { SecurityEvalChatClient } from './chat_client';

export interface SecurityDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
    expectedToolCalls?: string[];
    maxToolCalls?: number;
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

function createShortestPathEvaluatorLocal(): Evaluator {
  return createShortestPathEvaluator({
    maxToolCallsExtractor: (expected) =>
      (expected as SecurityDatasetExample['output'] | null)?.maxToolCalls,
  });
}

export function createEvaluateSecurityDataset({
  evaluators,
  executorClient,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: SecurityEvalChatClient;
  traceEsClient: Client;
  log: ToolingLog;
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

    const trajectoryEvaluator = createTrajectoryEvaluator({
      extractToolCalls: (output: unknown) =>
        getToolCallSteps(output as TaskOutput)
          .map((s) => s.tool_id)
          .filter((id): id is string => Boolean(id)),
      goldenPathExtractor: (expected: unknown) => {
        return (expected as SecurityDatasetExample['output'])?.expectedToolCalls ?? [];
      },
      orderWeight: 0.5,
      coverageWeight: 0.5,
    });

    // Note: skillInvocationEvaluator disabled because OTel trace index does not
    // contain `attributes.elastic.inference.skill.name`. The platform telemetry
    // gap is tracked separately; tool-call coverage is already enforced by
    // toolCallsEvaluator + trajectoryEvaluator.

    await executorClient.runExperiment(
      {
        datasets: [dataset],
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
      [
        createEndpointCriteriaEvaluator({ evaluators }),
        trajectoryEvaluator,
        evaluators.traceBasedEvaluators.toolCalls,
        createShortestPathEvaluatorLocal(),
      ]
    );
  };
}
