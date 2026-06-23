/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import {
  DEFAULT_ALERTS_SNAPSHOT_CONFIG,
  resolveAlertsSnapshotConfig,
  restoreAlertsSnapshot,
} from '@kbn/security-evals-alerts-snapshot';
import { evaluate } from '../src/evaluate';
import { multiStepScenarios } from '../src/datasets';

const ALERTS_SNAPSHOT_ENV_PREFIX = 'MULTI_STEP_ALERTS_SNAPSHOT';

const DATASET_NAME = 'security: security-multi-step';
const DATASET_DESCRIPTION =
  'Cross-category Agent Builder chain: alert triage → entity investigation → detection rule creation.';

evaluate.describe('Security Multi-step Execution', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ esClient, log, uiSettings }) => {
    // Ensure Agent Builder experimental features are enabled
    await uiSettings.set({ 'agentBuilder:experimentalFeatures': true });

    const snapshotConfig = resolveAlertsSnapshotConfig(ALERTS_SNAPSHOT_ENV_PREFIX);
    if (snapshotConfig) {
      log.info(
        `[multi-step] restoring alerts snapshot (gs://${snapshotConfig.bucket}/${snapshotConfig.basePath})`
      );
      await restoreAlertsSnapshot({ esClient, log, config: snapshotConfig });
    } else {
      log.warning(
        '[multi-step] skipping snapshot restore — evaluating against existing cluster alerts.'
      );
      log.warning(
        `Default snapshot: gs://${DEFAULT_ALERTS_SNAPSHOT_CONFIG.bucket}/${DEFAULT_ALERTS_SNAPSHOT_CONFIG.basePath}`
      );
    }

    log.info(`[multi-step] dataset has ${multiStepScenarios.length} examples`);
  });

  evaluate.afterAll(async ({ uiSettings }) => {
    await uiSettings.unset('agentBuilder:experimentalFeatures');
  });

  evaluate('multi-step scenarios', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: DATASET_NAME,
        description: DATASET_DESCRIPTION,
        examples: multiStepScenarios,
      },
    });
  });
});
