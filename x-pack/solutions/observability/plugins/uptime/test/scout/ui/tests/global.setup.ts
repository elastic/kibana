/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import { testData } from '../fixtures';

globalSetupHook(
  'Ingest uptime test data',
  { tag: ['@local-stateful-classic'] },
  async ({ esArchiver, kbnClient, log }) => {
    log.debug('[setup] enabling legacy uptime app...');
    await kbnClient.uiSettings.update({
      'observability:enableLegacyUptimeApp': true,
    });

    log.debug('[setup] loading full heartbeat data...');
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.FULL_HEARTBEAT);

    log.debug('[setup] loading browser data...');
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.BROWSER);
  }
);
