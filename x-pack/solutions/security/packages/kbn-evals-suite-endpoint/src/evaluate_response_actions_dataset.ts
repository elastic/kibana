/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTrajectoryEvaluator,
  getToolCallSteps,
  type AgentBuilderClient,
  type DefaultEvaluators,
  type EvaluationDataset,
  type Evaluator,
  type EvalsExecutorClient,
  type Example,
  type TaskOutput,
} from '@kbn/evals';
import { converseQuestionToTaskOutput } from './converse_task';
import { createEndpointCriteriaEvaluator } from './evaluate_dataset';

export interface ResponseActionsDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
    tool_sequence?: string[];
  };
  metadata?: {
    golden_id?: string;
    row_type?: string;
    forbidden_tools?: readonly string[];
    [key: string]: unknown;
  };
}

export type EvaluateResponseActionsDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: ResponseActionsDatasetExample[];
  };
}) => Promise<void>;

/**
 * CODE evaluator: fails any example whose actual tool-call trajectory invoked
 * a tool listed in `metadata.forbidden_tools` (e.g. distractor / boundary rows
 * that must never dispatch a write action). Mirrors the "no write action
 * without explicit intent" and "distractor" scenarios in the spec.
 */
export const createResponseActionsForbiddenToolsEvaluator = (): Evaluator<
  ResponseActionsDatasetExample,
  TaskOutput
> => ({
  name: 'Forbidden Tools',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const forbiddenTools = metadata?.forbidden_tools ?? [];

    if (forbiddenTools.length === 0) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No forbidden_tools annotation — skipping.',
      };
    }

    const observedToolIds = new Set(
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => typeof id === 'string')
    );

    const violated = forbiddenTools.filter((toolId) => observedToolIds.has(toolId));
    const score = violated.length === 0 ? 1 : 0;

    return {
      score,
      label: score === 1 ? 'pass' : 'fail',
      explanation:
        violated.length > 0
          ? `Called forbidden tool(s): ${violated.join(', ')}`
          : 'No forbidden tools called.',
    };
  },
});

export const createResponseActionsTrajectoryEvaluator = (): Evaluator<
  ResponseActionsDatasetExample,
  TaskOutput
> => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => typeof id === 'string'),
    goldenPathExtractor: (expected) => {
      const exp = expected as ResponseActionsDatasetExample['output'] | undefined;
      return exp?.tool_sequence ?? [];
    },
    orderWeight: 0.6,
    coverageWeight: 0.4,
  });

  return {
    ...inner,
    name: 'Trajectory',
    evaluate: async (args) => {
      const exp = args.expected as ResponseActionsDatasetExample['output'] | undefined;
      if (!exp?.tool_sequence || exp.tool_sequence.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No tool_sequence annotation — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  } as Evaluator<ResponseActionsDatasetExample, TaskOutput>;
};

export const buildResponseActionsEvaluators = ({
  evaluators,
}: {
  evaluators: DefaultEvaluators;
}): Array<Evaluator<ResponseActionsDatasetExample, TaskOutput>> => {
  const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
    evaluators.traceBasedEvaluators;

  return [
    createEndpointCriteriaEvaluator({ evaluators }) as Evaluator<
      ResponseActionsDatasetExample,
      TaskOutput
    >,
    createResponseActionsForbiddenToolsEvaluator(),
    createResponseActionsTrajectoryEvaluator(),
    toolCalls as Evaluator<ResponseActionsDatasetExample, TaskOutput>,
    latency as Evaluator<ResponseActionsDatasetExample, TaskOutput>,
    inputTokens as Evaluator<ResponseActionsDatasetExample, TaskOutput>,
    outputTokens as Evaluator<ResponseActionsDatasetExample, TaskOutput>,
    cachedTokens as Evaluator<ResponseActionsDatasetExample, TaskOutput>,
  ];
};

export function createEvaluateResponseActionsDataset({
  evaluators,
  executorClient,
  agentBuilderClient,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  agentBuilderClient: AgentBuilderClient;
}): EvaluateResponseActionsDataset {
  return async function evaluateResponseActionsDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: ResponseActionsDatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset<ResponseActionsDatasetExample>;

    await executorClient.runExperiment(
      {
        datasets: [dataset],
        task: async ({ input }) => converseQuestionToTaskOutput(agentBuilderClient, input.question),
      },
      buildResponseActionsEvaluators({ evaluators })
    );
  };
}
