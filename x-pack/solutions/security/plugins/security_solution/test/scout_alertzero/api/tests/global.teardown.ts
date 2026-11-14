/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout-security';
import { restoreRuntimeSettings } from '../fixtures/runtime_settings';

globalTeardownHook(
  'Restore the AlertZero runtime advanced settings',
  async ({ kbnClient, log }) => {
    await restoreRuntimeSettings({ kbnClient, log, suiteKey: 'security_solution_api' });
  }
);
