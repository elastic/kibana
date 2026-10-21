/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { IS_ADD_DATA_PAGE_V2_ENABLED } from '../../../../common/feature_flags';

globalSetupHook(
  'Enable the Add Data page V2 feature flag',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.all] },
  async ({ apiServices, log }) => {
    log.info(`[setup] Enabling ${IS_ADD_DATA_PAGE_V2_ENABLED}...`);
    await apiServices.core.settings({
      'feature_flags.overrides': { [IS_ADD_DATA_PAGE_V2_ENABLED]: true },
    });
  }
);
