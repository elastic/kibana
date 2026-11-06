/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsExecutorClient } from '@kbn/evals';
import { ensureEntityStoreRunning } from './seeding/install_entity_store';
import { cleanupAllSeededData } from './seeding/teardown';
import type { Scenario, ScenarioContext, ScenarioTaskOutput } from './types';

/**
 * Runs a single scenario as its own `runExperiment` call with a one-example
 * dataset. `runExperiment` has no per-example lifecycle hooks, so seed and
 * teardown live inside the task, wrapped in `try`/`finally` so teardown runs
 * even when the pipeline run or an earlier step throws — otherwise the next
 * scenario would classify against this one's leftover leads/entities.
 */
export const runScenario = async ({
  scenario,
  ctx,
  executorClient,
}: {
  scenario: Scenario;
  ctx: ScenarioContext;
  executorClient: EvalsExecutorClient;
}): Promise<void> => {
  await ensureEntityStoreRunning({ kbnClient: ctx.kbnClient, log: ctx.log });

  await executorClient.runExperiment(
    {
      datasets: [
        {
          name: scenario.name,
          description: scenario.description,
          examples: [
            scenario.rubricCriteria ? { metadata: { description: scenario.rubricCriteria } } : {},
          ],
        },
      ],
      task: async (): Promise<ScenarioTaskOutput> => {
        try {
          await scenario.seed(ctx);
          const steps = await scenario.run(ctx);
          const last = steps.at(-1);
          return {
            leads: last?.leads ?? null,
            errors: last?.errors,
            steps,
          };
        } finally {
          await cleanupAllSeededData({ esClient: ctx.esClient, euids: scenario.euids });
        }
      },
      concurrency: 1,
    },
    scenario.evaluators(ctx)
  );
};
