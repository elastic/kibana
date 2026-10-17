/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook, tags } from '@kbn/scout-oblt';
import { SLO_COMPOSITE_ENABLED } from '../../../../common/feature_flags';

globalTeardownHook(
  'Teardown environment for SLO tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apiServices, log }) => {
    log.debug('[teardown] Reverting composite SLO feature flag...');
    await apiServices.core.settings({
      'feature_flags.overrides': { [SLO_COMPOSITE_ENABLED]: false },
    });
  }
);
