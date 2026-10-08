/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';

globalSetupHook(
  'Disable alerting v2 for the plain Alerts navigation link',
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
