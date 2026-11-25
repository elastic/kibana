/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook, tags } from '@kbn/scout-oblt';
import { unsetAlertingV2EnabledSetting } from '../fixtures/alerting_v2_setting';

globalTeardownHook(
  'Reset alerting:v2:enabled',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ kbnClient, log }) => {
    log.debug('[teardown] unsetting alerting:v2:enabled');
    await unsetAlertingV2EnabledSetting(kbnClient);
  }
);
