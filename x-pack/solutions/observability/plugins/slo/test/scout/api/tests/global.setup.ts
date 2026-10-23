/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { pollUntilTrue } from '../fixtures/slo_poll';

const COMPOSITE_SLO_PATH = '/api/observability/slo_composites';
/** Interval at which every Kibana instance re-reads the dynamic config overrides saved object. */
const CONFIG_POLL_INTERVAL_MS = 10_000;
const PROPAGATION_STABLE_WINDOW_MS = CONFIG_POLL_INTERVAL_MS + 2_000;
const PROPAGATION_TIMEOUT_MS = 60_000;
const PROPAGATION_POLL_INTERVAL_MS = 1_000;

globalSetupHook(
  'Setup environment for SLO API tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ apiServices, kbnClient, log }) => {
    log.debug('[setup] Enabling the composite SLO feature flag...');
    await apiServices.core.settings({
      'feature_flags.overrides': { 'slo.compositeSloEnabled': true },
    });

    // The override is applied in memory only on the instance that serves the PUT; other Cloud
    // instances pick it up from the saved object on their next config poll. Gate setup on composite
    // routes answering 200 for longer than one poll interval, so every instance has converged
    // before the first spec runs instead of racing the propagation window.
    log.debug('[setup] Waiting for the composite SLO feature flag to propagate...');
    let enabledSince: number | undefined;
    let lastOutcome = 'no response';
    try {
      await pollUntilTrue(
        async () => {
          try {
            const { status } = await kbnClient.request({
              path: COMPOSITE_SLO_PATH,
              method: 'GET',
              headers: { 'x-elastic-internal-origin': 'kibana' },
              ignoreErrors: [404],
            });
            lastOutcome = `status ${status}`;
            if (status !== 200) {
              enabledSince = undefined;
              return false;
            }
            enabledSince = enabledSince ?? Date.now();
            return Date.now() - enabledSince >= PROPAGATION_STABLE_WINDOW_MS;
          } catch (error) {
            // A warming-up deployment can answer with a transient error; keep polling rather than
            // failing every spec in the run, and report it if the gate never converges.
            lastOutcome = `error: ${(error as Error).message}`;
            enabledSince = undefined;
            return false;
          }
        },
        { timeoutMs: PROPAGATION_TIMEOUT_MS, intervalMs: PROPAGATION_POLL_INTERVAL_MS }
      );
    } catch {
      throw new Error(
        `Composite SLO routes did not stay enabled for ${PROPAGATION_STABLE_WINDOW_MS}ms within ` +
          `${PROPAGATION_TIMEOUT_MS}ms of setting slo.compositeSloEnabled. Last outcome: ${lastOutcome}`
      );
    }
    log.debug('[setup] Composite SLO feature flag confirmed');
  }
);
