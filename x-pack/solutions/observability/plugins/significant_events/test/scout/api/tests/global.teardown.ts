/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { globalTeardownHook, tags } from '@kbn/scout-oblt';

globalTeardownHook(
  'Teardown environment for Significant Events API tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apiServices, log }) => {
    log.debug('[teardown] Reverting significant events availability feature flag...');
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [NIGHTSHIFT_ENABLED_FLAG]: null,
      },
    });

    log.debug('[teardown] Disabling Streams...');
    await apiServices.streams.disable();
  }
);
