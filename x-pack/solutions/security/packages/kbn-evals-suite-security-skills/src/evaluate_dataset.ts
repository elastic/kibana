/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  createQuantitativeCorrectnessEvaluators,
  createSkillInvocationEvaluator,
  getStringMeta,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type Example,
  type ExperimentTask,
  type TaskOutput,
  withEvaluatorSpan,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SecuritySkillsExample } from './dataset';
import type { SecuritySkillsAgentBuilderChatClient } from './chat_client';

export interface SecuritySkillsDatasetInput extends Record<string, unknown> {
  question: string;
}

export interface SecuritySkillsDatasetExpected {
  reference: string;
  expected: string;
  expectedSkill?: string;
  shouldNotActivateSkill?: string;
}

export interface SecuritySkillsDatasetMetadata extends Record<string, unknown> {
  category: string;
  query_intent: string;
  dataset_split: string[];
  is_distractor?: boolean;
}

export type SecuritySkillsDatasetExample = Example<
  SecuritySkillsDatasetInput,
  SecuritySkillsDatasetExpected,
  SecuritySkillsDatasetMetadata
>;

export const toDatasetExample = (ex: SecuritySkillsExample): SecuritySkillsDatasetExample => ({
  input: { question: ex.input.question },
  output: {
    reference: ex.expected.reference,
    expected: ex.expected.reference,
    ...(ex.expected.expectedSkill ? { expectedSkill: ex.expected.expectedSkill } : {}),
    ...(ex.expected.shouldNotActivateSkill
      ? { shouldNotActivateSkill: ex.expected.shouldNotActivateSkill }
      : {}),
  },
  metadata: {
    category: ex.metadata.category,
    query_intent: ex.metadata.query_intent,
    dataset_split: ex.metadata.dataset_split,
    ...(ex.metadata.is_distractor ? { is_distractor: true } : {}),
  },
});

const createDynamicSkillInvocationEvaluator = ({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}): Evaluator<SecuritySkillsDatasetExample, TaskOutput> => {
  return {
    name: 'Skill Invoked',
    kind: 'CODE',
    evaluate: async ({ output, expected, metadata }) => {
      const expectedSkill =
        (expected as SecuritySkillsDatasetExpected | undefined)?.expectedSkill ??
        getStringMeta(metadata, 'expectedSkill');
      const shouldNotActivate =
        (expected as SecuritySkillsDatasetExpected | undefined)?.shouldNotActivateSkill ??
        getStringMeta(metadata, 'shouldNotActivateSkill');

      const skillName = expectedSkill ?? shouldNotActivate;
      if (!skillName) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No expectedSkill or shouldNotActivateSkill annotation.',
        };
      }

      const inner = createSkillInvocationEvaluator({
        traceEsClient,
        log,
        skillName,
      });

      const result = await inner.evaluate({
        output,
        expected,
        metadata,
      } as unknown as Parameters<typeof inner.evaluate>[0]);

      if (shouldNotActivate && !expectedSkill) {
        const invoked = result.score === 1;
        return {
          ...result,
          score: invoked ? 0 : 1,
          explanation: invoked
            ? `Skill ${skillName} was invoked but should not have been.`
            : `Skill ${skillName} correctly not invoked.`,
        };
      }

      return result;
    },
  };
};

export type EvaluateSecuritySkillsDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: SecuritySkillsExample[];
  };
}) => Promise<void>;

export const buildSecuritySkillsEvaluators = ({
  evaluators,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  traceEsClient: EsClient;
  log: ToolingLog;
}): Array<Evaluator<SecuritySkillsDatasetExample, TaskOutput>> => {
  const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
    evaluators.traceBasedEvaluators;

  return [
    ...(createQuantitativeCorrectnessEvaluators() as Array<
      Evaluator<SecuritySkillsDatasetExample, TaskOutput>
    >),
    toolCalls as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
    latency as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
    inputTokens as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
    outputTokens as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
    cachedTokens as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
    createDynamicSkillInvocationEvaluator({ traceEsClient, log }),
  ];
};

const buildTask = ({
  chatClient,
  evaluators,
  log,
}: {
  chatClient: SecuritySkillsAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  log: ToolingLog;
}): ExperimentTask<SecuritySkillsDatasetExample, TaskOutput> => {
  return async (example) => {
    const { input, output: expected, metadata } = example;
    const question = input?.question ?? '';
    const questionPreview = `${question.slice(0, 120)}${question.length > 120 ? '...' : ''}`;
    log.info(`[security-skills] task request: question="${questionPreview}"`);

    const response = await chatClient.converse({ message: question });

    const taskOutput = {
      messages: response.messages,
      steps: response.steps,
      errors: response.errors,
      traceId: response.traceId,
    };

    const correctnessResult = await withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
      evaluators.correctnessAnalysis().evaluate({
        input,
        expected,
        output: taskOutput,
        metadata,
      })
    );

    return {
      ...taskOutput,
      correctnessAnalysis: correctnessResult?.metadata,
    };
  };
};

export const createEvaluateSecuritySkillsDataset = ({
  chatClient,
  evaluators,
  executorClient,
  traceEsClient,
  log,
}: {
  chatClient: SecuritySkillsAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateSecuritySkillsDataset => {
  return async ({ dataset: { name, description, examples } }) => {
    const wrappedExamples = examples.map(toDatasetExample);

    const dataset = {
      name,
      description,
      examples: wrappedExamples,
    } satisfies EvaluationDataset<SecuritySkillsDatasetExample>;

    const evalStack = buildSecuritySkillsEvaluators({ evaluators, traceEsClient, log });
    const task = buildTask({ chatClient, evaluators, log });

    await executorClient.runExperiment({ datasets: [dataset], task }, evalStack);
  };
};
