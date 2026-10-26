/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook, tags } from '@kbn/scout-oblt';
import { IS_ADD_DATA_PAGE_V2_ENABLED } from '../../../../common/feature_flags';

globalTeardownHook(
  'Revert the Add Data page V2 feature flag',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.all] },
  async ({ apiServices, log }) => {
    log.info(`[teardown] Removing the ${IS_ADD_DATA_PAGE_V2_ENABLED} override...`);
    // `null` removes the override; the flag had no configured override before, so `false` would force it off server-wide.
    await apiServices.core.settings({
      'feature_flags.overrides': { [IS_ADD_DATA_PAGE_V2_ENABLED]: null },
    });
  }
);
