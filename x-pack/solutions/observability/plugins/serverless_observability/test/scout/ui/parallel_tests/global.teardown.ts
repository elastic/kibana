/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook, tags } from '@kbn/scout-oblt';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';

globalTeardownHook(
  'Restore the default alerting v2 setting',
  {
    tag: [
      ...tags.serverless.observability.complete,
      ...tags.serverless.observability.logs_essentials,
    ],
  },
  async ({ kbnClient, log }) => {
    log.debug('[teardown] restoring the default alerting v2 setting');
    await kbnClient.request({
      description: `unset ${ALERTING_V2_ENABLED_SETTING_ID}`,
      path: `/internal/kibana/global_settings/${encodeURIComponent(
        ALERTING_V2_ENABLED_SETTING_ID
      )}`,
      method: 'DELETE',
    });
    await kbnClient.uiSettings.waitForEventualCacheRefresh();
  }
);
