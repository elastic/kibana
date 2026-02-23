/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { testData } from '../fixtures';

globalSetupHook(
  'Ingest Exploratory View test data',
  { tag: tags.stateful.classic },
  async ({ esArchiver, log }) => {
    const archives = [
      testData.ES_ARCHIVES.RUM_8_0_0,
      testData.ES_ARCHIVES.RUM_TEST_DATA,
      testData.ES_ARCHIVES.FULL_HEARTBEAT,
      testData.ES_ARCHIVES.BROWSER,
    ];

    log.debug('[setup] loading test data (only if indexes do not exist)...');
    for (const archive of archives) {
      await esArchiver.loadIfNeeded(archive);
    }
  }
);
