/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvalsExecutorClient, EvaluationDataset, Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AttackDiscoveryClient } from './clients/attack_discovery_client';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from './types';
import { runAttackDiscovery } from './task/run_attack_discovery';
import { createAttackDiscoveryBasicEvaluator } from './evaluators/attack_discovery_basic_evaluator';
import { createAttackDiscoveryRubricEvaluator } from './evaluators/attack_discovery_rubric_evaluator';

const resolveConcurrency = (): number | undefined => {
  const raw = process.env.ATTACK_DISCOVERY_EVAL_CONCURRENCY;
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(1, Math.floor(parsed));
};

export type EvaluateAttackDiscoveryDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: AttackDiscoveryDatasetExample[];
  };
  trustUpstreamDataset?: boolean;
}) => Promise<void>;

const configureExperiment = ({
  attackDiscoveryClient,
  inferenceClient,
  evaluationInferenceClient,
  log,
}: {
  attackDiscoveryClient: AttackDiscoveryClient;
  inferenceClient: BoundInferenceClient;
  evaluationInferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): {
  task: (params: {
    input: AttackDiscoveryDatasetExample['input'];
  }) => Promise<AttackDiscoveryTaskOutput>;
  evaluators: Array<Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput>>;
} => {
  return {
    task: async ({ input }) => {
      if (!input) {
        return { insights: null, errors: ['Missing input'] };
      }

      return runAttackDiscovery({
        inferenceClient,
        attackDiscoveryClient,
        input,
        log,
      });
    },
    evaluators: [
      createAttackDiscoveryBasicEvaluator(),
      createAttackDiscoveryRubricEvaluator({ inferenceClient: evaluationInferenceClient, log }),
    ],
  };
};

export const createEvaluateAttackDiscoveryDataset = ({
  attackDiscoveryClient,
  executorClient,
  inferenceClient,
  evaluationConnectorId,
  log,
}: {
  attackDiscoveryClient: AttackDiscoveryClient;
  executorClient: EvalsExecutorClient;
  inferenceClient: BoundInferenceClient;
  evaluationConnectorId: string;
  log: ToolingLog;
}): EvaluateAttackDiscoveryDataset => {
  const evaluateAttackDiscoveryDataset: EvaluateAttackDiscoveryDataset = async ({
    dataset: { name, description, examples },
    trustUpstreamDataset = false,
  }) => {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset<AttackDiscoveryDatasetExample>;

    const evaluationInferenceClient = inferenceClient.bindTo({
      connectorId: evaluationConnectorId,
    });

    const { task, evaluators } = configureExperiment({
      attackDiscoveryClient,
      inferenceClient,
      evaluationInferenceClient,
      log,
    });

    await executorClient.runExperiment(
      {
        dataset,
        task: async ({ input }) => task({ input }),
        concurrency: resolveConcurrency(),
        trustUpstreamDataset,
      },
      evaluators
    );
  };

  return evaluateAttackDiscoveryDataset;
};
