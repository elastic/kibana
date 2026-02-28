/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { testData } from '../fixtures';

globalSetupHook(
  'Ingest Synthetics test data',
  { tag: tags.stateful.classic },
  async ({ esArchiver, esClient, log }) => {
    log.debug('[setup] loading test data (only if indexes do not exist)...');
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.FULL_HEARTBEAT);
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.BROWSER);

    // synthetics_data targets Fleet-managed data streams (no mappings.json),
    // so loadIfNeeded can't detect existing data streams. Check manually.
    const { count } = await esClient.count({
      index: 'synthetics-browser-default',
      ignore_unavailable: true,
    });
    if (count === 0) {
      log.debug('[setup] loading synthetics_data archive...');
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.SYNTHETICS_DATA);
    } else {
      log.debug('[setup] synthetics_data already loaded, skipping...');
    }
  }
);
