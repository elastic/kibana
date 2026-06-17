/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvalsExecutorClient, EvaluationDataset, Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { LeadGenerationClient } from './clients/lead_generation_client';
import type { LeadGenerationDatasetExample, LeadGenerationTaskOutput } from './types';
import { runLeadGeneration } from './task/run_lead_generation';
import { createLeadGenerationBasicEvaluator } from './evaluators/lead_generation_basic_evaluator';
import { createLeadGenerationRubricEvaluator } from './evaluators/lead_generation_rubric_evaluator';

/**
 * Lead generation must run sequentially (concurrency=1) by default.
 *
 * The pipeline is async: `generate` returns an executionUuid immediately and
 * the pipeline runs in the background. `generateAndWait` then polls
 * `/status.lastExecutionUuid` until it matches. If two examples run in parallel
 * and both call `generate`, the first to complete overwrites `lastExecutionUuid`
 * so the other example can never match its own UUID and times out.
 *
 * Override with LEAD_GENERATION_EVAL_CONCURRENCY=N only if you implement a
 * per-execution status mechanism on the server side.
 */
const resolveConcurrency = (): number => {
  const raw = process.env.LEAD_GENERATION_EVAL_CONCURRENCY;
  if (!raw) return 1;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
};

export type EvaluateLeadGenerationDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: LeadGenerationDatasetExample[];
  };
  trustUpstreamDataset?: boolean;
}) => Promise<void>;

const configureExperiment = ({
  leadGenerationClient,
  inferenceClient,
  evaluationInferenceClient,
  connectorId,
  log,
}: {
  leadGenerationClient: LeadGenerationClient;
  inferenceClient: BoundInferenceClient;
  evaluationInferenceClient: BoundInferenceClient;
  connectorId: string;
  log: ToolingLog;
}): {
  task: (params: {
    input: LeadGenerationDatasetExample['input'];
  }) => Promise<LeadGenerationTaskOutput>;
  evaluators: Array<Evaluator<LeadGenerationDatasetExample, LeadGenerationTaskOutput>>;
} => ({
  task: async ({ input }) => {
    if (!input) {
      return { leads: null, errors: ['Missing input'] };
    }

    return runLeadGeneration({
      leadGenerationClient,
      connectorId,
      input,
      log,
    });
  },
  evaluators: [
    createLeadGenerationBasicEvaluator(),
    createLeadGenerationRubricEvaluator({ inferenceClient: evaluationInferenceClient, log }),
  ],
});

export const createEvaluateLeadGenerationDataset = ({
  leadGenerationClient,
  executorClient,
  inferenceClient,
  connectorId,
  evaluationConnectorId,
  log,
}: {
  leadGenerationClient: LeadGenerationClient;
  executorClient: EvalsExecutorClient;
  inferenceClient: BoundInferenceClient;
  connectorId: string;
  evaluationConnectorId: string;
  log: ToolingLog;
}): EvaluateLeadGenerationDataset => {
  const evaluateLeadGenerationDataset: EvaluateLeadGenerationDataset = async ({
    dataset: { name, description, examples },
    trustUpstreamDataset = false,
  }) => {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset<LeadGenerationDatasetExample>;

    const evaluationInferenceClient = inferenceClient.bindTo({
      connectorId: evaluationConnectorId,
    });

    const { task, evaluators } = configureExperiment({
      leadGenerationClient,
      inferenceClient,
      evaluationInferenceClient,
      connectorId,
      log,
    });

    await executorClient.runExperiment(
      {
        datasets: [dataset],
        task: async ({ input }) => task({ input }),
        concurrency: resolveConcurrency(),
        trustUpstreamDataset,
      },
      evaluators
    );
  };

  return evaluateLeadGenerationDataset;
};
