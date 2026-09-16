/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
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
// Security-owned fork: also scores load_skill spans (the platform
// createSkillInvocationEvaluator only understands filestore.read).
import { createSecuritySkillInvocationEvaluator } from './security_skill_invocation_evaluator';
import { wrapSkillInvocationForDistractors } from './evaluate_forensic_dataset';

/** Must match defineSkillType({ name }) in endpoint_response_actions/index.ts */
export const ENDPOINT_RESPONSE_ACTIONS_SKILL_NAME = 'endpoint-response-actions';

export interface ResponseActionsDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
    tool_sequence?: string[];
  };
  metadata?: Record<string, unknown>;
}

export type EvaluateResponseActionsDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: ResponseActionsDatasetExample[];
  };
}) => Promise<void>;

const FILESTORE_READ_TOOL_ID = 'filestore.read';
const LOAD_SKILL_TOOL_ID = 'load_skill';

/**
 * Skill routing is an implementation detail of how the platform loads the
 * skill, not something the analyst asked for, so it is filtered out of the
 * trajectory before the golden `tool_sequence` is compared.
 */
const SKILL_ROUTING_TOOL_IDS = new Set([FILESTORE_READ_TOOL_ID, LOAD_SKILL_TOOL_ID]);

export const createResponseActionsTrajectoryEvaluator = (): Evaluator<
  ResponseActionsDatasetExample,
  TaskOutput
> => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => typeof id === 'string' && !SKILL_ROUTING_TOOL_IDS.has(id)),
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

/**
 * Scores the negative space of the read-only slice: a row may declare
 * `metadata.forbidden_tools`, and any call to one of them scores 0.
 *
 * The trajectory evaluator cannot cover this case — it returns N/A for rows
 * with an empty `tool_sequence`, which is exactly the "do not improvise a
 * state-changing action" row — so without this evaluator the most
 * consequential assertion in the slice would be carried by an LLM criterion
 * alone.
 */
export const createForbiddenToolCallEvaluator = (): Evaluator<
  ResponseActionsDatasetExample,
  TaskOutput
> => ({
  name: 'ForbiddenToolCalls',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const forbidden = (metadata?.forbidden_tools as string[] | undefined) ?? [];
    if (forbidden.length === 0) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No forbidden_tools annotation — skipping forbidden-call evaluation.',
      };
    }

    const called = new Set(
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => typeof id === 'string')
    );
    const violations = forbidden.filter((id) => called.has(id));

    return {
      score: violations.length === 0 ? 1 : 0,
      label: violations.length === 0 ? 'no_forbidden_calls' : 'forbidden_tool_called',
      explanation:
        violations.length === 0
          ? 'Did not call any forbidden tool.'
          : `Called forbidden tool(s): ${violations.join(', ')}`,
    };
  },
});

export const buildResponseActionsEvaluators = ({
  evaluators,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  traceEsClient: EsClient;
  log: ToolingLog;
}): Array<Evaluator<ResponseActionsDatasetExample, TaskOutput>> => {
  const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
    evaluators.traceBasedEvaluators;

  return [
    createEndpointCriteriaEvaluator({ evaluators }) as Evaluator<
      ResponseActionsDatasetExample,
      TaskOutput
    >,
    toolCalls as Evaluator<ResponseActionsDatasetExample, TaskOutput>,
    latency as Evaluator<ResponseActionsDatasetExample, TaskOutput>,
    inputTokens as Evaluator<ResponseActionsDatasetExample, TaskOutput>,
    outputTokens as Evaluator<ResponseActionsDatasetExample, TaskOutput>,
    cachedTokens as Evaluator<ResponseActionsDatasetExample, TaskOutput>,
    wrapSkillInvocationForDistractors(
      createSecuritySkillInvocationEvaluator({
        traceEsClient,
        log,
        skillName: ENDPOINT_RESPONSE_ACTIONS_SKILL_NAME,
      }) as Evaluator<ResponseActionsDatasetExample, TaskOutput>
    ),
    createForbiddenToolCallEvaluator(),
    createResponseActionsTrajectoryEvaluator(),
  ];
};

export function createEvaluateResponseActionsDataset({
  evaluators,
  executorClient,
  agentBuilderClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  agentBuilderClient: AgentBuilderClient;
  traceEsClient: EsClient;
  log: ToolingLog;
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
      buildResponseActionsEvaluators({ evaluators, traceEsClient, log })
    );
  };
}
