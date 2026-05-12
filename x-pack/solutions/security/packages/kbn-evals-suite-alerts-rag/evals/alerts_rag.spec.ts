/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { alertsRagDataset, filterByCategory, getDatasetCategories } from '../src/datasets';
import {
  DEFAULT_ALERTS_SNAPSHOT_CONFIG,
  resolveAlertsSnapshotConfig,
  restoreAlertsSnapshot,
} from '../src/data_generators/restore_alerts_snapshot';

const DATASET_NAME = 'Security Alerts RAG Regression';
const DATASET_DESCRIPTION =
  'Security Agent Builder alerts RAG evaluation. Drives `/api/agent_builder/converse` ' +
  'over the shared Security alerts snapshot (reused with the Attack Discovery eval suite).';

evaluate.describe('Security Alerts RAG', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ esClient, log }) => {
    const snapshotConfig = resolveAlertsSnapshotConfig();
    if (snapshotConfig) {
      log.info(
        `[alerts-rag] restoring alerts snapshot for evaluation cluster ` +
          `(gs://${snapshotConfig.bucket}/${snapshotConfig.basePath}, ` +
          `snapshot="${snapshotConfig.snapshotName ?? 'latest'}")`
      );
      await restoreAlertsSnapshot({ esClient, log, config: snapshotConfig });
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

  for (const category of getDatasetCategories()) {
    const examples = filterByCategory(category);

    evaluate.describe(category, () => {
      examples.forEach((example, idx) => {
        evaluate(
          `[${idx + 1}/${examples.length}] ${example.input}`,
          async ({ evaluateDataset }) => {
            await evaluateDataset({
              dataset: {
                name: `${DATASET_NAME} › ${category}`,
                description: DATASET_DESCRIPTION,
                examples: [example],
              },
            });
          }
        );
      });
    });
  }
});
