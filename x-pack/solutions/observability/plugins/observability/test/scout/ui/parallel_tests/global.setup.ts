/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import { createDataView, generateRulesData } from '../fixtures/generators';

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: ['@ess', '@svlOblt'] },
  async ({ apiServices, log, esClient, kbnClient }) => {
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

    log.info('Generating shared rules for rules list tests...');
    await generateRulesData(apiServices);
  }
);
