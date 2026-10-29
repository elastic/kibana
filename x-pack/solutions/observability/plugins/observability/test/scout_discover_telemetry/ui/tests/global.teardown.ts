/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout-oblt';
import { DISCOVER_KBN_ARCHIVES } from '../fixtures/setup';

globalTeardownHook(
  'Unload Discover telemetry data',
  { tag: ['@local-serverless-observability_complete'] },
  async ({ kbnClient }) => {
    for (const archive of DISCOVER_KBN_ARCHIVES) {
      await kbnClient.importExport.unload(archive);
    }
    await kbnClient.uiSettings.unset('timepicker:timeDefaults');
  }
);
