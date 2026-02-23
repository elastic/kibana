/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createQuantitativeCorrectnessEvaluators,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type Example,
  type EvaluationDataset,
  type RanExperiment,
  createQuantitativeGroundednessEvaluator,
  selectEvaluators,
  withEvaluatorSpan,
  type ExperimentTask,
  type TaskOutput,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EvaluationChatClient } from './chat_client';
import {
  createToolUsageOnlyEvaluator,
  createTokenUsageEvaluator,
} from './evaluators';

interface DatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string;
  };
  metadata?: {
    [key: string]: unknown;
  };
}

/** Default concurrency for running examples in parallel */
const DEFAULT_CONCURRENCY = 3;

export type EvaluateDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: DatasetExample[];
  };
  /** Number of examples to run concurrently (default: 3) */
  concurrency?: number;
}) => Promise<void>;

function configureExperiment({
  evaluators,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  chatClient: EvaluationChatClient;
}): {
  task: ExperimentTask<DatasetExample, TaskOutput>;
  evaluators: ReturnType<typeof selectEvaluators>;
} {
  const task: ExperimentTask<DatasetExample, TaskOutput> = async ({ input, output, metadata }) => {
    const response = await chatClient.converse({
      messages: [{ message: input.question }],
    });

    // Running correctness and groundedness evaluators as part of the task since their respective quantitative evaluators need their output
    // Wrap LLM judge calls in @kbn/evals spans and assign root context to prevent them from contributing to latency, token use and other metrics of the EvaluateExample span
    const [correctnessResult, groundednessResult] = await Promise.all([
      withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
        evaluators.correctnessAnalysis().evaluate({
          input,
          expected: output,
          output: response,
          metadata,
        })
      ),
      withEvaluatorSpan('GroundednessAnalysis', {}, () =>
        evaluators.groundednessAnalysis().evaluate({
          input,
          expected: output,
          output: response,
          metadata,
        })
      ),
    ]);

    return {
      errors: response.errors,
      messages: response.messages,
      steps: response.steps,
      traceId: response.traceId,
      modelUsage: response.modelUsage,
      correctnessAnalysis: correctnessResult?.metadata,
      groundednessAnalysis: groundednessResult?.metadata,
    };
  };

  const selectedEvaluators = selectEvaluators([
    createToolUsageOnlyEvaluator(),
    createTokenUsageEvaluator(),
    // Core evaluators: Factuality, Relevance, Sequence Accuracy
    ...createQuantitativeCorrectnessEvaluators(),
    // Groundedness evaluator
    createQuantitativeGroundednessEvaluator(),
  ]);

  return { task, evaluators: selectedEvaluators };
}

export function createEvaluateDataset({
  evaluators,
  executorClient,
  chatClient,
  log,
  onExperimentComplete,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: EvaluationChatClient;
  log: ToolingLog;
  onExperimentComplete?: (experiment: RanExperiment) => Promise<void>;
}): EvaluateDataset {
  return async function evaluateDataset({
    dataset: { name, description, examples },
    concurrency = DEFAULT_CONCURRENCY,
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DatasetExample[];
    };
    concurrency?: number;
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    const { task, evaluators: selectedEvaluators } = configureExperiment({
      evaluators,
      chatClient,
    });

    const experiment = await executorClient.runExperiment(
      {
        dataset,
        task,
        concurrency,
      },
      selectedEvaluators
    );

    if (onExperimentComplete) {
      await onExperimentComplete(experiment);
    }
  };
}
