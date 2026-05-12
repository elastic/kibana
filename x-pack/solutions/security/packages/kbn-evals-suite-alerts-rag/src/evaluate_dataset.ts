/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
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
import type { AlertsRagCategory, AlertsRagExample } from './dataset';
import type { AlertsRagAgentBuilderChatClient } from './chat_client';

/**
 * Wrapped input type for the kbn-evals framework. Must extend
 * `Record<string, unknown>` to satisfy the `Example<TInput>` constraint.
 */
export interface AlertsRagDatasetInput extends Record<string, unknown> {
  question: string;
}

/**
 * Dataset-level expected output. `reference` is the ground-truth answer used
 * by qualitative scoring; `expected` is the field the framework's
 * `correctnessAnalysis` evaluator reads (it consumes `expected.expected`).
 * We persist both so a single dataset row drives correctness and
 * groundedness scoring.
 */
export interface AlertsRagDatasetExpected {
  reference: string;
  expected: string;
}

export interface AlertsRagDatasetMetadata extends Record<string, unknown> {
  category: AlertsRagCategory;
  dataset_split: string[];
}

export type AlertsRagDatasetExample = Example<
  AlertsRagDatasetInput,
  AlertsRagDatasetExpected,
  AlertsRagDatasetMetadata
>;

export const toDatasetExample = (ex: AlertsRagExample): AlertsRagDatasetExample => ({
  input: { question: ex.input },
  output: { reference: ex.expected.reference, expected: ex.expected.reference },
  metadata: {
    category: ex.metadata.category,
    dataset_split: ex.metadata.dataset_split,
  },
});

export type EvaluateAlertsRagDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: AlertsRagExample[];
  };
}) => Promise<void>;

/**
 * The evaluator set is load-bearing for the suite's regression story: each
 * name in this list corresponds to a column in the Buildkite eval report. A
 * silent drop or rename would skip regression coverage without changing the
 * suite's exit code, so the set is pinned in `evaluate_dataset.test.ts`.
 */
export const buildAlertsRagEvaluators = (): Array<
  Evaluator<AlertsRagDatasetExample, TaskOutput>
> => [
  ...(createQuantitativeCorrectnessEvaluators() as Array<
    Evaluator<AlertsRagDatasetExample, TaskOutput>
  >),
  createQuantitativeGroundednessEvaluator() as Evaluator<AlertsRagDatasetExample, TaskOutput>,
];

const buildTask = ({
  chatClient,
  evaluators,
  log,
}: {
  chatClient: AlertsRagAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  log: ToolingLog;
}): ExperimentTask<AlertsRagDatasetExample, TaskOutput> => {
  return async (example) => {
    const { input, output: expected, metadata } = example;
    const question = input?.question ?? '';
    const questionPreview = `${question.slice(0, 120)}${question.length > 120 ? '...' : ''}`;
    log.info(`[alerts-rag] task request: question="${questionPreview}"`);

    const response = await chatClient.converse({ message: question });

    // The framework's analysis evaluators read `output.messages[length-1]`
    // and `output.steps`. `converse` returns the same shape.
    const taskOutput = {
      messages: response.messages,
      steps: response.steps,
      errors: response.errors,
      traceId: response.traceId,
    };

    // Precompute the qualitative analyses inside the task so the deterministic
    // Factuality / Relevance / Sequence Accuracy / Groundedness evaluators
    // downstream are pure functions of the precomputed analyses (mirrors the
    // pattern in `@kbn/evals-suite-agent-builder`).
    const [correctnessResult, groundednessResult] = await Promise.all([
      withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
        evaluators.correctnessAnalysis().evaluate({
          input,
          expected,
          output: taskOutput,
          metadata,
        })
      ),
      withEvaluatorSpan('GroundednessAnalysis', {}, () =>
        evaluators.groundednessAnalysis().evaluate({
          input,
          expected,
          output: taskOutput,
          metadata,
        })
      ),
    ]);

    return {
      ...taskOutput,
      correctnessAnalysis: correctnessResult?.metadata,
      groundednessAnalysis: groundednessResult?.metadata,
    };
  };
};

export const createEvaluateAlertsRagDataset = ({
  chatClient,
  evaluators,
  executorClient,
  log,
}: {
  chatClient: AlertsRagAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  log: ToolingLog;
}): EvaluateAlertsRagDataset => {
  return async ({ dataset: { name, description, examples } }) => {
    const wrappedExamples = examples.map(toDatasetExample);

    const dataset = {
      name,
      description,
      examples: wrappedExamples,
    } satisfies EvaluationDataset<AlertsRagDatasetExample>;

    const evalStack = buildAlertsRagEvaluators();
    const task = buildTask({ chatClient, evaluators, log });

    await executorClient.runExperiment({ dataset, task }, evalStack);
  };
};
