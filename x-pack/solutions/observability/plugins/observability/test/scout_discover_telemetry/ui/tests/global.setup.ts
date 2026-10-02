/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import { DISCOVER_KBN_ARCHIVES, DISCOVER_TIME_DEFAULTS, ES_ARCHIVES } from '../fixtures/setup';

globalSetupHook(
  'Load Discover telemetry data',
  { tag: ['@local-serverless-observability_complete'] },
  async ({ esArchiver, kbnClient }) => {
    for (const archive of ES_ARCHIVES) {
      await esArchiver.loadIfNeeded(archive);
    }
    for (const archive of DISCOVER_KBN_ARCHIVES) {
      await kbnClient.importExport.load(archive);
    }
    await kbnClient.uiSettings.update({ 'timepicker:timeDefaults': DISCOVER_TIME_DEFAULTS });
  }
);
