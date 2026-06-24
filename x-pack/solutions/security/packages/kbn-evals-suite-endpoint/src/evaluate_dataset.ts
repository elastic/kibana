/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type {
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  EvalsExecutorClient,
  Example,
  TaskOutput,
} from '@kbn/evals';
import {
  createSkillInvocationEvaluator,
  createTrajectoryEvaluator,
  getToolCallSteps,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SecurityEvalChatClient } from './chat_client';

export interface SecurityDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
    /** Optional golden tool order for L2 trajectory; defaults to baseline troubleshooting sequence. */
    tool_sequence?: string[];
  };
}

const FILESTORE_READ_TOOL_ID = 'filestore.read';

/** Minimum-sufficient sequence from elastic-defend-configuration-troubleshooting SKILL.md process. */
export const ENDPOINT_BASELINE_TOOL_SEQUENCE = [
  'automatic_troubleshooting.check_endpoint_package_freshness',
  'automatic_troubleshooting.generate_insight',
] as const;

export function deriveEndpointGoldenToolSequence(
  expected: SecurityDatasetExample['output'] | undefined
): string[] {
  if (expected?.tool_sequence && expected.tool_sequence.length > 0) {
    return expected.tool_sequence;
  }
  return [...ENDPOINT_BASELINE_TOOL_SEQUENCE];
}

export function createEndpointTrajectoryEvaluator(): Evaluator<
  SecurityDatasetExample,
  TaskOutput
> {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => Boolean(id) && id !== FILESTORE_READ_TOOL_ID),
    goldenPathExtractor: (expected) =>
      deriveEndpointGoldenToolSequence(expected as SecurityDatasetExample['output']),
    orderWeight: 0.6,
    coverageWeight: 0.4,
  });

  return {
    ...inner,
    name: 'Trajectory',
    evaluate: async (args) => inner.evaluate(args),
  } as Evaluator<SecurityDatasetExample, TaskOutput>;
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
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: SecurityEvalChatClient;
  traceEsClient: EsClient;
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

    const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
      evaluators.traceBasedEvaluators;

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
        createSkillInvocationEvaluator({
          traceEsClient,
          log,
          skillName: 'elastic-defend-configuration-troubleshooting',
        }) as Evaluator<SecurityDatasetExample, TaskOutput>,
        createEndpointTrajectoryEvaluator(),
        toolCalls as Evaluator<SecurityDatasetExample, TaskOutput>,
        latency as Evaluator<SecurityDatasetExample, TaskOutput>,
        inputTokens as Evaluator<SecurityDatasetExample, TaskOutput>,
        outputTokens as Evaluator<SecurityDatasetExample, TaskOutput>,
        cachedTokens as Evaluator<SecurityDatasetExample, TaskOutput>,
      ]
    );
  };
}
