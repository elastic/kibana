/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';

// Keeps the plain Alerts navigation link, which alerting v2 replaces with a panel.
globalSetupHook(
  'Disable alerting v2',
  {
    tag: [
      ...tags.serverless.observability.complete,
      ...tags.serverless.observability.logs_essentials,
    ],
  },
  async ({ kbnClient, log }) => {
    log.debug('[setup] disabling alerting v2');
    await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: false });
    await kbnClient.uiSettings.waitForEventualCacheRefresh();
  }
);
