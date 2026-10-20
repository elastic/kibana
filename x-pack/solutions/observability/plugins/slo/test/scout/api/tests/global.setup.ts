/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-oblt';
import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { SLO_COMPOSITE_ENABLED } from '../../../../common/feature_flags';

const COMPOSITE_SLO_PROBE_PATH = '/api/observability/slo_composites?page=1&perPage=1';

// `PUT /internal/core/_settings` only updates the Kibana instance that served it; the others in a
// Cloud deployment re-read the persisted override on a 10s timer, so the gate must be seen open
// across a full refresh interval before a load-balanced request can be trusted not to hit a
// lagging instance.
const GATE_SETTLE_MS = 15_000;
const GATE_PROBE_INTERVAL_MS = 1_000;
const GATE_TIMEOUT_MS = 120_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForCompositeSloGate = async (kbnClient: KbnClient) => {
  const deadline = Date.now() + GATE_TIMEOUT_MS;
  let openSince: number | undefined;

  while (Date.now() < deadline) {
    const { status } = await kbnClient.request({
      method: 'GET',
      path: COMPOSITE_SLO_PROBE_PATH,
      ignoreErrors: [404],
    });

    if (status === 404) {
      openSince = undefined;
    } else {
      openSince ??= Date.now();
      if (Date.now() - openSince >= GATE_SETTLE_MS) {
        return;
      }
    }

    await sleep(GATE_PROBE_INTERVAL_MS);
  }

  throw new Error(
    `${SLO_COMPOSITE_ENABLED} was not consistently effective within ${GATE_TIMEOUT_MS}ms`
  );
};

globalSetupHook(
  'Enable the composite SLO feature flag',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apiServices, kbnClient, log }) => {
    log.info(`[setup] enabling ${SLO_COMPOSITE_ENABLED}...`);
    await apiServices.core.settings({
      'feature_flags.overrides': { [SLO_COMPOSITE_ENABLED]: true },
    });

    await waitForCompositeSloGate(kbnClient);
    log.info(`[setup] ${SLO_COMPOSITE_ENABLED} is effective`);
  }
);
