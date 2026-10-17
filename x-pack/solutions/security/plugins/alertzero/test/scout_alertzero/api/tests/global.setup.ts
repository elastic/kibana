/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-security';
import { setAlertZeroEnabled } from '../fixtures/helpers';

globalSetupHook('Enable the AlertZero advanced setting', async ({ kbnClient, log }) => {
  log.debug('[setup] enabling securitySolution:enableAlertZero');
  await setAlertZeroEnabled(kbnClient, true);
});
