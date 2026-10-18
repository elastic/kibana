/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import type { KbnClient, ScoutLogger } from '@kbn/scout-oblt';
import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { SLO_COMPOSITE_ENABLED } from '../../../../common/feature_flags';

const COMPOSITE_SLO_PATH = '/api/observability/slo_composites';
const FLAG_STABLE_FOR_MS = 12_000;
const FLAG_READY_TIMEOUT_MS = 90_000;
const FLAG_POLL_INTERVAL_MS = 500;

// `apiServices.core.settings()` applies the override in memory only on the instance that handles the
// PUT; the others pick it up from the persisted saved object on their next 10s config poll. Cloud
// load-balances across those instances, so a single success proves nothing — require the composite
// routes (they answer 404 while the flag is off) to stay enabled across a full poll period, which
// resets as soon as a lagging instance answers.
const waitForCompositeSloRoutes = async (kbnClient: KbnClient, log: ScoutLogger) => {
  const deadline = Date.now() + FLAG_READY_TIMEOUT_MS;
  let enabledSince: number | undefined;

  while (Date.now() < deadline) {
    const { status } = await kbnClient.request({
      method: 'GET',
      path: COMPOSITE_SLO_PATH,
      ignoreErrors: [404],
    });

    if (status === 404) {
      enabledSince = undefined;
    } else {
      enabledSince = enabledSince ?? Date.now();
      if (Date.now() - enabledSince >= FLAG_STABLE_FOR_MS) {
        log.debug('[setup] Composite SLO routes are enabled on every Kibana instance');
        return;
      }
    }

    await delay(FLAG_POLL_INTERVAL_MS);
  }

  throw new Error(
    `GET ${COMPOSITE_SLO_PATH} did not stay enabled for ${FLAG_STABLE_FOR_MS}ms within ${FLAG_READY_TIMEOUT_MS}ms of setting ${SLO_COMPOSITE_ENABLED}`
  );
};

globalSetupHook(
  'Setup environment for SLO API tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apiServices, kbnClient, log }) => {
    log.debug('[setup] Enabling the composite SLO feature flag...');
    await apiServices.core.settings({
      'feature_flags.overrides': { [SLO_COMPOSITE_ENABLED]: true },
    });

    await waitForCompositeSloRoutes(kbnClient, log);
  }
);
