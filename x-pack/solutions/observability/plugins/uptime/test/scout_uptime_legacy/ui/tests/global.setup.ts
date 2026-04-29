/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import { testData } from '../fixtures';

globalSetupHook(
  'Ingest Uptime test data',
  { tag: '@local-stateful-classic' },
  async ({ esArchiver, log }) => {
    log.info('[setup] Loading ES archives for Uptime Scout tests...');
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.FULL_HEARTBEAT);
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.BROWSER);
    log.info('[setup] Uptime ES archives loaded successfully');
  }
);
