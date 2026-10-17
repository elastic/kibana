/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { SLO_COMPOSITE_ENABLED } from '../../../../common/feature_flags';

// Instances that did not serve the override only apply it on core's 10s config poll.
const DYNAMIC_CONFIG_PROPAGATION_MS = 15_000;

globalSetupHook(
  'Enable composite SLOs for SLO API tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apiServices, log }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': { [SLO_COMPOSITE_ENABLED]: true },
    });

    log.info(
      `Waiting ${DYNAMIC_CONFIG_PROPAGATION_MS}ms for '${SLO_COMPOSITE_ENABLED}' to reach every Kibana instance`
    );
    await new Promise((resolve) => setTimeout(resolve, DYNAMIC_CONFIG_PROPAGATION_MS));
  }
);
