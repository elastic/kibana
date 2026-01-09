/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import { createDataView, generateLogsData, generateRulesData } from '../fixtures/generators';

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: ['@ess', '@svlOblt'] },
  async ({ apiServices, log, logsSynthtraceEsClient, kbnClient, esClient }) => {
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

    // Generate logs data first
    log.info('Generating logs data...');
    await generateLogsData({
      from: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      to: Date.now(),
      client: logsSynthtraceEsClient,
    });

    log.info('Creating data view for logs-* after data is indexed...');
    await createDataView(kbnClient, {
      name: 'test-data-view-name_1',
      id: 'test-data-view-id_1',
      title: 'logs-*',
    });
  }
);
