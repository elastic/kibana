/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetRunResult, EvaluationDataset, EvalsExecutorClient } from '@kbn/evals';
import type { DefendInsightsApiClient } from './defend_insights/defend_insights_api_client';
import { createExpectedInsightGroupsEvaluator } from './defend_insights/expected_insight_groups_evaluator';
import { createGenerationSucceededEvaluator } from './defend_insights/generation_succeeded_evaluator';
import { createInsightsWellFormedEvaluator } from './defend_insights/insights_well_formed_evaluator';
import { createNegativeControlEvaluator } from './defend_insights/negative_control_evaluator';
import type {
  DefendInsightsDatasetExample,
  DefendInsightsTaskOutput,
} from './defend_insights/types';

export type EvaluateDefendInsightsDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: DefendInsightsDatasetExample[];
  };
}) => Promise<DatasetRunResult[]>;

export const createEvaluateDefendInsightsDataset = ({
  executorClient,
  apiClient,
  connectorId,
  actionTypeId,
}: {
  executorClient: EvalsExecutorClient;
  apiClient: DefendInsightsApiClient;
  connectorId: string;
  actionTypeId: string;
}): EvaluateDefendInsightsDataset => {
  return async function evaluateDefendInsightsDataset({
    dataset: { name, description, examples },
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset<DefendInsightsDatasetExample>;

    return executorClient.runExperiment(
      {
        datasets: [dataset],
        task: async ({ input }): Promise<DefendInsightsTaskOutput> => {
          if (!input) {
            return {
              status: 'request_failed',
              insights: null,
              latencyMs: 0,
              error: 'Missing example input',
            };
          }
          const startedAt = Date.now();
          try {
            return await apiClient.generateIncompatibleAntivirus({
              endpointId: input.endpointId,
              connectorId,
              actionTypeId,
            });
          } catch (e) {
            // One example's exception must not abort the experiment; score it as infra.
            return {
              status: 'request_failed',
              insights: null,
              latencyMs: Date.now() - startedAt,
              error: `task threw: ${e instanceof Error ? e.message : String(e)}`.slice(0, 800),
            };
          }
        },
        // One generation at a time: each hits the shared LLM connector and a single ES.
        concurrency: 1,
      },
      [
        createGenerationSucceededEvaluator(),
        createInsightsWellFormedEvaluator(),
        createExpectedInsightGroupsEvaluator(),
        createNegativeControlEvaluator(),
      ]
    );
  };
};
