/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  AgentBuilderClient,
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  EvalsExecutorClient,
  Example,
  TaskOutput,
} from '@kbn/evals';
import { converseQuestionToTaskOutput } from './converse_task';
import {
  createForensicTrajectoryEvaluator,
  wrapSkillInvocationForDistractors,
} from './evaluate_forensic_dataset';
import { createSecuritySkillInvocationEvaluator } from './security_skill_invocation_evaluator';

/** Must match defineSkillType({ name }) in endpoint_response_actions/index.ts. */
export const ENDPOINT_RESPONSE_ACTIONS_SKILL_NAME = 'endpoint-response-actions';

export interface SecurityDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
    tool_sequence?: string[];
  };
  metadata?: Record<string, unknown>;
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
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  agentBuilderClient: AgentBuilderClient;
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
    } satisfies EvaluationDataset<SecurityDatasetExample>;

    const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
      evaluators.traceBasedEvaluators;

    await executorClient.runExperiment(
      {
        datasets: [dataset],
        task: async ({ input }) => converseQuestionToTaskOutput(agentBuilderClient, input.question),
      },
      [
        createEndpointCriteriaEvaluator({ evaluators }) as Evaluator<
          SecurityDatasetExample,
          TaskOutput
        >,
        toolCalls as Evaluator<SecurityDatasetExample, TaskOutput>,
        latency as Evaluator<SecurityDatasetExample, TaskOutput>,
        inputTokens as Evaluator<SecurityDatasetExample, TaskOutput>,
        outputTokens as Evaluator<SecurityDatasetExample, TaskOutput>,
        cachedTokens as Evaluator<SecurityDatasetExample, TaskOutput>,
        wrapSkillInvocationForDistractors(
          createSecuritySkillInvocationEvaluator({
            traceEsClient,
            log,
            skillName: ENDPOINT_RESPONSE_ACTIONS_SKILL_NAME,
          }) as Evaluator<SecurityDatasetExample, TaskOutput>
        ),
        createForensicTrajectoryEvaluator() as Evaluator<SecurityDatasetExample, TaskOutput>,
      ]
    );
  };
}
