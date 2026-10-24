/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook, tags } from '@kbn/scout-oblt';

globalTeardownHook(
  'Teardown environment for SLO API tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apiServices, log }) => {
    log.debug('[teardown] Removing the composite SLO feature flag override...');
    await apiServices.core.settings({
      'feature_flags.overrides': { 'slo.compositeSloEnabled': null },
    });
  }
);
