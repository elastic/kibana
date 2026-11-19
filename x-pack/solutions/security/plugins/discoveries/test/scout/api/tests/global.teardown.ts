/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout-security';
import { disableWorkflowsFeatureFlag } from '../fixtures/helpers';

globalTeardownHook(
  'Revert the Attack Discovery workflows feature flag',
  async ({ apiServices, log }) => {
    log.debug('[teardown] disabling the Attack Discovery workflows feature flag');
    await disableWorkflowsFeatureFlag({ apiServices });
  }
);
