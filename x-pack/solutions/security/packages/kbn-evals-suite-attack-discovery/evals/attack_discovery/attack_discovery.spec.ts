/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { loadAttackDiscoveryBundledAlertsJsonlDataset } from '../../src/dataset/load_attack_discovery_jsonl';
import { runAttackDiscovery } from '../../src/task/run_attack_discovery';

const resolveDatasetLimit = (): number | undefined => {
  const raw = process.env.ATTACK_DISCOVERY_DATASET_LIMIT;
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(1, Math.floor(parsed));
};

const resolveDatasetOffset = (): number | undefined => {
  const raw = process.env.ATTACK_DISCOVERY_DATASET_OFFSET;
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.floor(parsed));
};

evaluate.describe('Attack Discovery', { tag: tags.stateful.classic }, () => {
  evaluate('bundled alerts (jsonl)', async ({ evaluateDataset }) => {
    const dataset = await loadAttackDiscoveryBundledAlertsJsonlDataset({
      offset: resolveDatasetOffset(),
      limit: resolveDatasetLimit(),
    });
    await evaluateDataset({ dataset });
  });

  evaluate.describe('modes smoke', () => {
    evaluate(
      'searchAlerts mode (defaults)',
      async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
        await executorClient.runExperiment(
          {
            dataset: {
              name: 'attack discovery: searchAlerts smoke',
              description: 'Smoke test for the searchAlerts mode',
              examples: [
                {
                  input: { mode: 'searchAlerts', size: 1 } as const,
                  output: { attackDiscoveries: [] },
                },
              ],
            },
            task: async ({ input }) =>
              runAttackDiscovery({
                inferenceClient,
                attackDiscoveryClient,
                input,
                log,
              }),
          },
          [
            {
              name: 'Ran',
              kind: 'CODE',
              evaluate: async ({ output }) => ({ score: output?.insights !== undefined ? 1 : 0 }),
            },
          ]
        );
      }
    );

    evaluate(
      'graphState mode (defaults)',
      async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
        await executorClient.runExperiment(
          {
            dataset: {
              name: 'attack discovery: graphState smoke',
              description: 'Smoke test for the graphState mode',
              examples: [
                {
                  input: { mode: 'graphState', anonymizedAlerts: [] } as const,
                  output: { attackDiscoveries: [] },
                },
              ],
            },
            task: async ({ input }) =>
              runAttackDiscovery({
                inferenceClient,
                attackDiscoveryClient,
                input,
                log,
              }),
          },
          [
            {
              name: 'Ran',
              kind: 'CODE',
              evaluate: async ({ output }) => ({ score: output?.insights !== undefined ? 1 : 0 }),
            },
          ]
        );
      }
    );
  });
});
