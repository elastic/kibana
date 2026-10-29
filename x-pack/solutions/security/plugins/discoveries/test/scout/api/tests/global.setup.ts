/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-security';
import { enableWorkflowsFeatureFlag } from '../fixtures/helpers';

globalSetupHook(
  'Enable the Attack Discovery workflows feature flag',
  async ({ apiServices, log }) => {
    log.debug('[setup] enabling the Attack Discovery workflows feature flag');
    await enableWorkflowsFeatureFlag({ apiServices });
  }
);
