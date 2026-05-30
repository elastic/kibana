/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { cleanup, generate, type PartialConfig } from '@kbn/data-forge';
import type { ScoutLogger } from '@kbn/scout-oblt';

/**
 * The index `@kbn/data-forge` writes the `fake_hosts` dataset to. The metric
 * threshold rule reads from it via the metrics source `metricAlias`.
 */
export const METRIC_THRESHOLD_INDEX = 'kbn-data-forge-fake_hosts.fake_hosts-*';

/**
 * Programmatic data-forge config that drives a steady `system.cpu.user.pct` of
 * 90% so the metric threshold rule (`> 50%`) reliably fires. Mirrors the
 * `before` hook of the ported FTR `metric_threshold_rule` suite.
 */
export const METRIC_THRESHOLD_DATA_FORGE_CONFIG: PartialConfig = {
  schedule: [
    {
      template: 'good',
      start: 'now-10m',
      end: 'now+5m',
      metrics: [{ name: 'system.cpu.user.pct', method: 'linear', start: 0.9, end: 0.9 }],
    },
  ],
  indexing: { dataset: 'fake_hosts' },
};

export const installMetricThresholdDataForge = (
  esClient: Client,
  log: ScoutLogger
): Promise<string[]> =>
  generate({ client: esClient, config: METRIC_THRESHOLD_DATA_FORGE_CONFIG, logger: log });

export const removeMetricThresholdDataForge = (esClient: Client, log: ScoutLogger): Promise<void> =>
  cleanup({ client: esClient, config: METRIC_THRESHOLD_DATA_FORGE_CONFIG, logger: log });
