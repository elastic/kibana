/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import {
  DEFAULT_ALERTS_SNAPSHOT_CONFIG,
  resolveAlertsSnapshotConfig,
  restoreAlertsSnapshot,
} from '@kbn/security-evals-alerts-snapshot';
import { evaluate } from '../../src/evaluate';
import { loadAttackDiscoveryBundledAlertsJsonlDataset } from '../../src/dataset/load_attack_discovery_jsonl';
import { runAttackDiscovery } from '../../src/task/run_attack_discovery';

const ALERTS_SNAPSHOT_ENV_PREFIX = 'ATTACK_DISCOVERY_ALERTS_SNAPSHOT';

const DEFAULT_DATASET_NAME = 'Attack Discovery All Scenarios';
const DEFAULT_DATASET_DESCRIPTION =
  'Attack Discovery evaluation dataset (all scenarios). Resolved from golden cluster.';

const resolveDatasetName = (): string =>
  process.env.ATTACK_DISCOVERY_DATASET_NAME || DEFAULT_DATASET_NAME;

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

const GOLDEN_CLUSTER_KBN_URL_MARKERS = ['kbn-evals-serverless', 'gcp.elastic.cloud'] as const;

/**
 * Use golden-cluster upstream resolution when explicitly named or when
 * EVALUATIONS_KBN_URL points at the managed evals cluster (CI / dev-vault).
 * Local Scout runs default to the checked-in reference JSONL instead.
 */
const shouldResolveFromGoldenCluster = (): boolean => {
  if (process.env.ATTACK_DISCOVERY_DATASET_NAME) {
    return true;
  }

  const evaluationsKbnUrl = process.env.EVALUATIONS_KBN_URL ?? '';
  return GOLDEN_CLUSTER_KBN_URL_MARKERS.some((marker) => evaluationsKbnUrl.includes(marker));
};

evaluate.describe('Attack Discovery', { tag: tags.stateful.classic }, () => {
  /**
   * Full dataset evaluation — three modes (priority order):
   *
   * 1. **Explicit JSONL path** (`ATTACK_DISCOVERY_DATASET_JSONL_PATH`)
   * 2. **Golden cluster** (`ATTACK_DISCOVERY_DATASET_NAME` or golden `EVALUATIONS_KBN_URL`)
   * 3. **Bundled reference JSONL** at `data/eval_dataset_attack_discovery_all_scenarios.jsonl`
   */
  evaluate('bundled alerts (jsonl)', async ({ evaluateDataset }) => {
    const jsonlPath = process.env.ATTACK_DISCOVERY_DATASET_JSONL_PATH;
    const jsonlOptions = {
      offset: resolveDatasetOffset(),
      limit: resolveDatasetLimit(),
    };

    if (jsonlPath) {
      const dataset = await loadAttackDiscoveryBundledAlertsJsonlDataset({
        jsonlPath,
        ...jsonlOptions,
      });
      await evaluateDataset({ dataset });
      return;
    }

    if (shouldResolveFromGoldenCluster()) {
      await evaluateDataset({
        dataset: {
          name: resolveDatasetName(),
          description: DEFAULT_DATASET_DESCRIPTION,
          examples: [],
        },
        trustUpstreamDataset: true,
      });
      return;
    }

    const dataset = await loadAttackDiscoveryBundledAlertsJsonlDataset(jsonlOptions);
    await evaluateDataset({ dataset });
  });

  evaluate.describe('modes smoke', () => {
    const snapshotConfig = resolveAlertsSnapshotConfig(ALERTS_SNAPSHOT_ENV_PREFIX);

    evaluate(
      'searchAlerts mode (defaults)',
      async ({ executorClient, inferenceClient, log, attackDiscoveryClient, esClient }) => {
        if (snapshotConfig) {
          log.info(
            `Restoring alerts snapshot for searchAlerts smoke test (gs://${snapshotConfig.bucket}/${
              snapshotConfig.basePath
            }, snapshot="${snapshotConfig.snapshotName ?? 'latest'}")...`
          );
          await restoreAlertsSnapshot({ esClient, log, config: snapshotConfig });
        } else {
          log.info(
            'Skipping snapshot restore (missing GCS_CREDENTIALS or explicitly disabled). ' +
              `Default snapshot is pinned to gs://${DEFAULT_ALERTS_SNAPSHOT_CONFIG.bucket}/${DEFAULT_ALERTS_SNAPSHOT_CONFIG.basePath}. ` +
              'To override, set ATTACK_DISCOVERY_ALERTS_SNAPSHOT_BUCKET/BASE_PATH/NAME.'
          );
        }

        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'attack discovery: searchAlerts smoke',
                description: 'Smoke test for the searchAlerts mode',
                examples: [
                  {
                    input: { mode: 'searchAlerts', size: 1 } as const,
                    output: { attackDiscoveries: [] },
                  },
                ],
              },
            ],
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
              evaluate: async ({ output }) => ({ score: Array.isArray(output?.insights) ? 1 : 0 }),
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
            datasets: [
              {
                name: 'attack discovery: graphState smoke',
                description: 'Smoke test for the graphState mode',
                examples: [
                  {
                    input: { mode: 'graphState', anonymizedAlerts: [] } as const,
                    output: { attackDiscoveries: [] },
                  },
                ],
              },
            ],
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
              evaluate: async ({ output }) => ({ score: Array.isArray(output?.insights) ? 1 : 0 }),
            },
          ]
        );
      }
    );
  });
});
