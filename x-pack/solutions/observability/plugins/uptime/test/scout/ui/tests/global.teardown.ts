/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout-oblt';

globalTeardownHook(
  'Teardown uptime test data',
  { tag: ['@local-stateful-classic'] },
  async ({ kbnClient, log }) => {
    log.debug('[teardown] disabling legacy uptime app...');
    await kbnClient.uiSettings.unset('observability:enableLegacyUptimeApp');
  }
);
