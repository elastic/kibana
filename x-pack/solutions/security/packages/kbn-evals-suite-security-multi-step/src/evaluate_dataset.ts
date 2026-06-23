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
  createTrajectoryEvaluator,
  getToolCallSteps,
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
import type { MultiStepExample } from './dataset';
import type { MultiStepAgentBuilderChatClient } from './chat_client';

const DEFAULT_PRIMARY_SKILL = 'alert-analysis';
const FILESTORE_READ_TOOL_ID = 'filestore.read';

export interface MultiStepDatasetInput extends Record<string, unknown> {
  turns: string[];
}

export interface MultiStepDatasetExpected {
  reference: string;
  expected: string;
  tool_sequence?: string[];
  primary_skill?: string;
}

export interface MultiStepDatasetMetadata extends Record<string, unknown> {
  scenario: string;
  dataset_split: string[];
  is_distractor?: boolean;
}

export type MultiStepDatasetExample = Example<
  MultiStepDatasetInput,
  MultiStepDatasetExpected,
  MultiStepDatasetMetadata
>;

export const toDatasetExample = (ex: MultiStepExample): MultiStepDatasetExample => ({
  input: { turns: ex.input.turns },
  output: {
    reference: ex.expected.reference,
    expected: ex.expected.reference,
    ...(ex.expected.tool_sequence ? { tool_sequence: ex.expected.tool_sequence } : {}),
    primary_skill: ex.expected.primary_skill ?? DEFAULT_PRIMARY_SKILL,
  },
  metadata: {
    scenario: ex.metadata.scenario,
    dataset_split: ex.metadata.dataset_split,
    ...(ex.metadata.is_distractor ? { is_distractor: true } : {}),
  },
});

export const createMultiStepTrajectoryEvaluator = (): Evaluator<
  MultiStepDatasetExample,
  TaskOutput
> => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => Boolean(id) && id !== FILESTORE_READ_TOOL_ID),
    goldenPathExtractor: (expected) => {
      const exp = expected as MultiStepDatasetExpected | undefined;
      return exp?.tool_sequence ?? [];
    },
    orderWeight: 0.6,
    coverageWeight: 0.4,
  });

  return {
    ...inner,
    name: 'Trajectory',
    evaluate: async (args) => {
      const exp = args.expected as MultiStepDatasetExpected | undefined;
      if (!exp?.tool_sequence || exp.tool_sequence.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No tool_sequence annotation — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  } as Evaluator<MultiStepDatasetExample, TaskOutput>;
};

export type EvaluateMultiStepDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: MultiStepExample[];
  };
}) => Promise<void>;

export const buildMultiStepEvaluators = ({
  evaluators,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  traceEsClient: EsClient;
  log: ToolingLog;
}): Array<Evaluator<MultiStepDatasetExample, TaskOutput>> => {
  const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
    evaluators.traceBasedEvaluators;

  return [
    ...(createQuantitativeCorrectnessEvaluators() as Array<
      Evaluator<MultiStepDatasetExample, TaskOutput>
    >),
    toolCalls as Evaluator<MultiStepDatasetExample, TaskOutput>,
    latency as Evaluator<MultiStepDatasetExample, TaskOutput>,
    inputTokens as Evaluator<MultiStepDatasetExample, TaskOutput>,
    outputTokens as Evaluator<MultiStepDatasetExample, TaskOutput>,
    cachedTokens as Evaluator<MultiStepDatasetExample, TaskOutput>,
    createSkillInvocationEvaluator({
      traceEsClient,
      log,
      skillName: DEFAULT_PRIMARY_SKILL,
    }) as Evaluator<MultiStepDatasetExample, TaskOutput>,
    createMultiStepTrajectoryEvaluator(),
  ];
};

const buildTask = ({
  chatClient,
  evaluators,
  log,
}: {
  chatClient: MultiStepAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  log: ToolingLog;
}): ExperimentTask<MultiStepDatasetExample, TaskOutput> => {
  return async (example) => {
    const { input, output: expected, metadata } = example;
    const turns = input?.turns ?? [];
    log.info(`[multi-step] running ${turns.length} turn(s) for scenario ${metadata?.scenario}`);

    const response = await chatClient.converseMultiTurn(turns);

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

export const createEvaluateMultiStepDataset = ({
  chatClient,
  evaluators,
  executorClient,
  traceEsClient,
  log,
}: {
  chatClient: MultiStepAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateMultiStepDataset => {
  return async ({ dataset: { name, description, examples } }) => {
    const wrappedExamples = examples.map(toDatasetExample);

    const dataset = {
      name,
      description,
      examples: wrappedExamples,
    } satisfies EvaluationDataset<MultiStepDatasetExample>;

    const evalStack = buildMultiStepEvaluators({ evaluators, traceEsClient, log });
    const task = buildTask({ chatClient, evaluators, log });

    await executorClient.runExperiment({ datasets: [dataset], task }, evalStack);
  };
};
