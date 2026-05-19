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
import { alertsRagDataset, filterByCategory, getDatasetCategories } from '../src/datasets';
import { verifyAlertsRagSnapshot } from '../src/datasets/snapshot_invariants';

const ALERTS_SNAPSHOT_ENV_PREFIX = 'ALERTS_RAG_ALERTS_SNAPSHOT';

const DATASET_NAME = 'Security Alerts RAG Regression';
const DATASET_DESCRIPTION =
  'Security Agent Builder alerts RAG evaluation. Drives `/api/agent_builder/converse` ' +
  'over the shared Security alerts snapshot (reused with the Attack Discovery eval suite).';

evaluate.describe('Security Alerts RAG', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ esClient, log }) => {
    const snapshotConfig = resolveAlertsSnapshotConfig(ALERTS_SNAPSHOT_ENV_PREFIX);
    if (snapshotConfig) {
      log.info(
        `[alerts-rag] restoring alerts snapshot for evaluation cluster ` +
          `(gs://${snapshotConfig.bucket}/${snapshotConfig.basePath}, ` +
          `snapshot="${snapshotConfig.snapshotName ?? 'latest'}")`
      );
      await restoreAlertsSnapshot({ esClient, log, config: snapshotConfig });
      // Verify the restored snapshot still matches the assumptions the dataset
      // reference answers were authored against. Surfaces snapshot↔dataset
      // drift as a single, actionable failure instead of a wall of
      // mysteriously-low Factuality scores. See snapshot_invariants.ts.
      await verifyAlertsRagSnapshot({ esClient, log });
    } else {
      log.warning(
        '[alerts-rag] skipping snapshot restore (missing GCS_CREDENTIALS or explicitly disabled). ' +
          `Default snapshot is pinned to gs://${DEFAULT_ALERTS_SNAPSHOT_CONFIG.bucket}/${DEFAULT_ALERTS_SNAPSHOT_CONFIG.basePath}. ` +
          'Agent Builder will be evaluated against whatever alerts already exist in the cluster.'
      );
    }

    log.info(
      `[alerts-rag] dataset has ${alertsRagDataset.length} examples across ${
        getDatasetCategories().length
      } categories`
    );
  });

  // One test per category, ALL examples batched into a single evaluateDataset
  // call. Earlier the spec invoked evaluateDataset once per example with
  // `examples: [example]`; because `DatasetClient.upsert` is a full-replace
  // per dataset name, the 2nd spec sharing a category clobbered the 1st and
  // only one example per category survived in the golden cluster (~33% data
  // loss every run, undermining baseline tracking). Aligns with every other
  // kbn-evals suite (pci-compliance, security-ai-rules, entity-analytics,
  // dashboard-migration), which all batch examples per dataset.
  for (const category of getDatasetCategories()) {
    const examples = filterByCategory(category);

    evaluate(`${category} (${examples.length} examples)`, async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: `${DATASET_NAME} › ${category}`,
          description: DATASET_DESCRIPTION,
          examples,
        },
      });
    });
  }
});
