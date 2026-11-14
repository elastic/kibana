/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout-security';
import { restoreAlertAnalysisSetting } from '../fixtures/runtime_settings';

globalTeardownHook('Restore alert analysis', async ({ kbnClient, log }) => {
  await restoreAlertAnalysisSetting({ kbnClient, log });
});
