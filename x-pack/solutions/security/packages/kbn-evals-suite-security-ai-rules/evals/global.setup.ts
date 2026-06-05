/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Global setup for security-ai-rules eval suite.
 *
 * RESTORE MODE (default when GCS_CREDENTIALS present):
 *   Restores a pre-built GCS snapshot containing all seeded indices.
 *   Fast, deterministic, no network calls.
 *
 * SEED MODE (fallback when GCS_CREDENTIALS missing):
 *   Seeds indices from scratch using GitHub downloads + endpoint episodes.
 *   Slow (~2-3 min), useful for local dev without snapshot access.
 */

import { globalSetupHook, tags } from '@kbn/scout';
import {
  DEFAULT_RULE_DATA_SNAPSHOT_CONFIG,
  resolveRuleDataSnapshotConfig,
  restoreRuleDataSnapshot,
  verifyRuleDataInvariants,
} from '@kbn/security-evals-rule-data-snapshot';
import { seedDataFromScratch } from './seed_data_from_scratch';

globalSetupHook(
  'Security AI Rules eval seed data',
  { tag: tags.stateful.classic },
  async ({ esClient, log }) => {
    const snapshotConfig = resolveRuleDataSnapshotConfig('SECURITY_AI_RULES');

    if (snapshotConfig) {
      log.info(
        `[security-ai-rules] restoring snapshot from ` +
          `gs://${snapshotConfig.bucket}/${snapshotConfig.basePath}`
      );
      await restoreRuleDataSnapshot({ esClient, log, config: snapshotConfig });
      await verifyRuleDataInvariants({ esClient, log });
    } else {
      log.warning(
        '[security-ai-rules] no GCS credentials; falling back to slow on-the-fly seeding. ' +
          `Default snapshot: gs://${DEFAULT_RULE_DATA_SNAPSHOT_CONFIG.bucket}/${DEFAULT_RULE_DATA_SNAPSHOT_CONFIG.basePath}`
      );
      await seedDataFromScratch({ esClient, log });
    }

    log.info('[security-ai-rules eval setup] done');
  }
);
