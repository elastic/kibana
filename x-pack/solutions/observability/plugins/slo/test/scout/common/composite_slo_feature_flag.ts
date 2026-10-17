/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import type { ApiServicesFixture, KbnClient, ScoutLogger } from '@kbn/scout-oblt';
import { SLO_COMPOSITE_ENABLED } from '../../../common/feature_flags';

const COMPOSITE_SLO_API_PATH = '/api/observability/slo_composites';
const FLAG_READY_TIMEOUT_MS = 60_000;
const FLAG_READY_POLL_INTERVAL_MS = 1_000;

export interface CompositeSloFeatureFlagDeps {
  apiServices: ApiServicesFixture;
  kbnClient: KbnClient;
  log: ScoutLogger;
}

/**
 * Turns `slo.compositeSloEnabled` on for the whole config run and waits until the composite
 * SLO routes actually answer, so no worker starts before the override is observable.
 */
export const enableCompositeSloFeatureFlag = async ({
  apiServices,
  kbnClient,
  log,
}: CompositeSloFeatureFlagDeps): Promise<void> => {
  log.debug('[setup] Enabling the composite SLO feature flag...');
  await apiServices.core.settings({
    'feature_flags.overrides': { [SLO_COMPOSITE_ENABLED]: true },
  });

  // `coreApi.settings()` resolves on the ack of `PUT /internal/core/_settings`, which applies the
  // override in memory on the Kibana that served it; peers pick it up from the persisted saved
  // object on their next config poll. Gate on the routes answering instead, otherwise specs race
  // that propagation window and read the `false` fallback, which makes every composite route 404.
  log.debug('[setup] Waiting for the composite SLO routes to answer...');
  const deadline = Date.now() + FLAG_READY_TIMEOUT_MS;
  let lastOutcome = 'no response';
  while (Date.now() < deadline) {
    try {
      const { status } = await kbnClient.request({
        path: COMPOSITE_SLO_API_PATH,
        method: 'GET',
        ignoreErrors: [404],
      });
      if (status === 200) {
        log.debug('[setup] Composite SLO feature flag confirmed');
        return;
      }
      lastOutcome = `status ${status}`;
    } catch (err) {
      lastOutcome = (err as Error).message;
    }
    await delay(FLAG_READY_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Composite SLO routes did not become available within ${FLAG_READY_TIMEOUT_MS}ms of enabling '${SLO_COMPOSITE_ENABLED}'. Last outcome: ${lastOutcome}`
  );
};

/** Reverts the config-wide `slo.compositeSloEnabled` override. Only safe once all workers finished. */
export const disableCompositeSloFeatureFlag = async ({
  apiServices,
  log,
}: Pick<CompositeSloFeatureFlagDeps, 'apiServices' | 'log'>): Promise<void> => {
  log.debug('[teardown] Reverting the composite SLO feature flag...');
  await apiServices.core.settings({
    'feature_flags.overrides': { [SLO_COMPOSITE_ENABLED]: false },
  });
};
