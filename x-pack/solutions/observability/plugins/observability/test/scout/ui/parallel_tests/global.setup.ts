/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import {
  createDataView,
  generateLogsData,
  generateRulesData,
  DATA_VIEWS,
} from '../fixtures/generators';

// ES archive path for metrics and logs test data
const ES_ARCHIVE_METRICS_AND_LOGS =
  'x-pack/solutions/observability/test/fixtures/es_archives/infra/metrics_and_logs';

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: ['@ess', '@svlOblt'] },
  async ({ apiServices, log, logsSynthtraceEsClient, kbnClient, esArchiver }) => {
    log.info('Generating Observability data...');
    await generateRulesData(apiServices);

    await generateLogsData({
      from: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      to: Date.now(),
      client: logsSynthtraceEsClient,
    });

    // Load ES archive for metrics and logs data (needed for custom threshold tests)
    log.info('Loading ES archive for metrics and logs...');
    await esArchiver.loadIfNeeded(ES_ARCHIVE_METRICS_AND_LOGS);

    // Create data views for custom threshold tests
    log.info('Creating data views for custom threshold tests...');
    await createDataView({
      kbnClient,
      log,
      id: DATA_VIEWS.FILEBEAT.ID,
      name: DATA_VIEWS.FILEBEAT.NAME,
      title: DATA_VIEWS.FILEBEAT.TITLE,
    });
    await createDataView({
      kbnClient,
      log,
      id: DATA_VIEWS.METRICBEAT.ID,
      name: DATA_VIEWS.METRICBEAT.NAME,
      title: DATA_VIEWS.METRICBEAT.TITLE,
    });

    await createDataView(kbnClient, {
      name: 'test-data-view-name_1',
      id: 'test-data-view-id_1',
      title: 'logs-*',
    });
  }
);
