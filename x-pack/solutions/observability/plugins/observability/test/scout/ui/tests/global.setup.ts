/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { resetAlertingV2NavSettings } from '../fixtures/alerting_v2_setting';

globalSetupHook(
  'Reset alerting v2 nav settings',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ kbnClient, log }) => {
    log.debug('[setup] resetting alerting v2 nav settings');
    await resetAlertingV2NavSettings(kbnClient);
  }
);
