/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type {
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  EvalsExecutorClient,
  Example,
} from '@kbn/evals';
import { createTrajectoryEvaluator } from '@kbn/evals';
import type { SecurityEvalChatClient } from './chat_client';
import {
  createInputTokensEvaluator,
  createOutputTokensEvaluator,
  createLlmCallsEvaluator,
  createToolCallsCodeEvaluator,
} from './token_usage_evaluators';

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

function createShortestPathEvaluator(): Evaluator {
  return {
    name: 'Shortest Path',
    kind: 'CODE' as const,
    evaluate: async ({ output, expected }) => {
      const expectedOutput = expected as SecurityDatasetExample['output'] | null;
      const maxToolCalls = expectedOutput?.maxToolCalls;
      const actualToolCalls =
        (output as { steps?: Array<{ type?: string; tool_id?: string }> })?.steps?.filter(
          (s) => s.type === 'tool_call'
        ).length ?? 0;

      if (!maxToolCalls || maxToolCalls <= 0) {
        return { score: 1, label: 'skipped', explanation: 'No maxToolCalls expectation set' };
      }

      const score =
        actualToolCalls <= maxToolCalls
          ? 1
          : Math.max(0, 1 - (actualToolCalls - maxToolCalls) * 0.2);
      return {
        score,
        label: score >= 1 ? 'optimal' : score >= 0.6 ? 'acceptable' : 'verbose',
        explanation: `Used ${actualToolCalls} tool calls (limit: ${maxToolCalls}).`,
        metadata: { actualToolCalls, maxToolCalls },
      };
    },
  };
}

export function createEvaluateSecurityDataset({
  evaluators,
  executorClient,
  chatClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: SecurityEvalChatClient;
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
      extractToolCalls: (output: unknown) => {
        const steps =
          (output as { steps?: Array<{ type?: string; tool_id?: string }> })?.steps ?? [];
        return steps
          .filter((s) => s.type === 'tool_call')
          .map((s) => s.tool_id ?? 'unknown')
          .filter(Boolean);
      },
      goldenPathExtractor: (expected: unknown) => {
        return (expected as SecurityDatasetExample['output'])?.expectedToolCalls ?? [];
      },
      orderWeight: 0.5,
      coverageWeight: 0.5,
    });

    const toolCallsEvaluator = createToolCallsCodeEvaluator();
    const inputTokensEvaluator = createInputTokensEvaluator();
    const outputTokensEvaluator = createOutputTokensEvaluator();
    const llmCallsEvaluator = createLlmCallsEvaluator();

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
            modelUsage: response.modelUsage,
          };
        },
      },
      [
        createEndpointCriteriaEvaluator({ evaluators }),
        trajectoryEvaluator,
        toolCallsEvaluator,
        inputTokensEvaluator,
        outputTokensEvaluator,
        llmCallsEvaluator,
        createShortestPathEvaluator(),
      ]
    );
  };
}
