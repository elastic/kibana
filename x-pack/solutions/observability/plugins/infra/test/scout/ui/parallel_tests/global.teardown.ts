/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { globalTeardownHook } from '../fixtures';
import { METRICS_AND_LOGS_INDEX_PATTERNS } from '../fixtures/constants';
import { deleteMetricsAnomaliesMlData } from '../fixtures/metrics_anomalies_ml';

globalTeardownHook(
  'Clean up infra data after UI parallel tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ infraSynthtraceEsClient, logsSynthtraceEsClient, apmSynthtraceEsClient, log }) => {
    log.info('Running infra UI global teardown...');

    await infraSynthtraceEsClient.clean();
    log.info('Infra synthtrace data cleaned');

    await logsSynthtraceEsClient.clean();
    log.info('Logs synthtrace data cleaned');

    await apmSynthtraceEsClient.clean();
    log.info('APM synthtrace data cleaned');

    log.info('Infra UI global teardown complete');
  }
);

// Mirror of the stateful-only ML setup in `global.setup.ts`. Deleting the jobs also removes their
// results and the space-scoped `ml-job` saved objects, so no separate cleanup of those is needed.
globalTeardownHook(
  'Clean up metrics anomalies ML jobs',
  { tag: tags.stateful.classic },
  async ({ apiServices, esClient, log }) => {
    await deleteMetricsAnomaliesMlData({ mlApi: apiServices.ml, esClient, log });
  }
);

// Drop the metricbeat archive loaded for Metrics Explorer so its data doesn't linger in the
// shared cluster for later runs (esArchiver only exposes `loadIfNeeded`, not an unload).
globalTeardownHook(
  'Clean up metrics_and_logs archive',
  { tag: tags.stateful.classic },
  async ({ esClient, log }) => {
    await esClient.indices
      .delete({ index: METRICS_AND_LOGS_INDEX_PATTERNS, ignore_unavailable: true })
      .catch(() => undefined);
    log.info('metrics_and_logs archive removed');
  }
);
