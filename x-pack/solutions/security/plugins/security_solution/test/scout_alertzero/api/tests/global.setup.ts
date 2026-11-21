/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-security';
import { applyRuntimeSettings } from '../fixtures/runtime_settings';

globalSetupHook('Apply the AlertZero runtime advanced settings', async ({ kbnClient, log }) => {
  await applyRuntimeSettings({ kbnClient, log, suiteKey: 'security_solution_api' });
});
