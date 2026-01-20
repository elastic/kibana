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
  generateMetricsData,
  generateRulesData,
} from '../fixtures/generators';
import { GENERATED_METRICS } from '../fixtures/constants';

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: ['@ess', '@svlOblt'] },
  async ({
    apiServices,
    log,
    logsSynthtraceEsClient,
    kbnClient,
    infraSynthtraceEsClient,
    esClient,
  }) => {
    log.info('Generating Observability data...');
    await generateRulesData(apiServices);

    log.info('Generating sample data into .alerts-observability.test index...');
    await esClient.index({
      index: '.alerts-observability.test',
      document: {
        '@timestamp': new Date().toISOString(),
        message: 'Test alert document',
        'service.name': 'test-service',
      },
      refresh: true,
    });

    log.info('Creating default data view for .alerts-* pattern...');
    await createDataView(kbnClient, {
      name: 'Default Alerts Data View',
      id: 'default-alerts-data-view',
      title: '.alerts-*',
    });

    await generateLogsData({
      from: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      to: Date.now(),
      client: logsSynthtraceEsClient,
    });

    await generateMetricsData({
      client: infraSynthtraceEsClient,
      from: Date.now() - 3 * 60 * 1000,
      to: Date.now(),
      metricName: GENERATED_METRICS.metricName,
    });
  }
);
