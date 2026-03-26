/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-security';

globalSetupHook('Agentless CSPM setup', async ({ log }) => {
  log.info('[setup] Agentless CSPM setup complete');
  log.info('[setup] cloud_security_posture package is pre-installed via server config');
});
