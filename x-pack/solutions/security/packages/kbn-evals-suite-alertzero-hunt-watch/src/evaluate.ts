/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { HuntWatchClient } from './harness/hunt_client';
import { ensureHuntWorkerEnabled } from './harness/worker_setup';

// Paths and feature ids are inlined like the template suite
// (threat-intel-enrichment): packages expose a single public entry point, so
// subpath imports into the plugins would break that boundary.
const INFERENCE_SETTINGS_URL = '/internal/search_inference_endpoints/settings';
const ALERTZERO_FAST_FEATURE_ID = 'alertzero_fast';
const ALERTZERO_REASONING_FEATURE_ID = 'alertzero_reasoning';
const TIER_FEATURE_IDS = new Set([ALERTZERO_FAST_FEATURE_ID, ALERTZERO_REASONING_FEATURE_ID]);

const INTERNAL_API_HEADERS = {
  'elastic-api-version': '1',
  'x-elastic-internal-origin': 'Kibana',
};

const WORKER_WORKFLOW_ID = 'system-security-hunt-continuous-threat-hunt';

interface InferenceFeatureSetting {
  feature_id: string;
  endpoints: Array<{ id: string }>;
}

interface InferenceSettingsResponse {
  data: { features: InferenceFeatureSetting[] };
}

/**
 * Extends the base `@kbn/evals` fixture with:
 * - `modelSettingsForHuntWatch` (auto, worker-scoped): pins the AlertZero
 *   Fast/Reasoning Model Settings to the model under test. Tier 2 resolves its
 *   model from the alertzero reasoning feature first and only then falls back
 *   to the stack defaults, so without this the run measures whatever the
 *   stack default is.
 * - `huntWorker` (worker-scoped): installs and enables the hunt Worker with a
 *   service account, and asserts it is enabled before any phase runs.
 * - `huntWatchClient` (worker-scoped): drives the SUT over real HTTP — the
 *   production threat-report ingest route, the candidates route, and the Worker
 *   manual trigger with `reportIds`, reading each hunt's coordinator output
 *   from the child execution's `run_hunt_coordinator` step output.
 */
export const evaluate = base.extend<
  {},
  {
    modelSettingsForHuntWatch: void;
    huntWorker: { serviceAccountId: string };
    huntWatchClient: HuntWatchClient;
    huntWorkerWorkflowId: string;
  }
>({
  modelSettingsForHuntWatch: [
    async ({ kbnClient, connector, log }, use) => {
      log.info(
        `[hunt-watch] Pinning Model Settings ` +
          `${ALERTZERO_FAST_FEATURE_ID}/${ALERTZERO_REASONING_FEATURE_ID}=${connector.id}`
      );

      // PUT replaces the whole saved object, so read first and merge: keep every
      // other feature pick and only overwrite the two tiers this suite drives.
      const existing = await kbnClient.request<InferenceSettingsResponse>({
        path: INFERENCE_SETTINGS_URL,
        method: 'GET',
        headers: INTERNAL_API_HEADERS,
      });
      const otherFeatures = (existing.data.data?.features ?? []).filter(
        (feature) => !TIER_FEATURE_IDS.has(feature.feature_id)
      );

      await kbnClient.request({
        path: INFERENCE_SETTINGS_URL,
        method: 'PUT',
        body: {
          features: [
            ...otherFeatures,
            { feature_id: ALERTZERO_FAST_FEATURE_ID, endpoints: [{ id: connector.id }] },
            { feature_id: ALERTZERO_REASONING_FEATURE_ID, endpoints: [{ id: connector.id }] },
          ],
        },
        headers: INTERNAL_API_HEADERS,
      });
      await use();
    },
    { scope: 'worker', auto: true },
  ],

  huntWorker: [
    async ({ kbnClient, log, modelSettingsForHuntWatch }, use) => {
      void modelSettingsForHuntWatch;
      await use(await ensureHuntWorkerEnabled(kbnClient, log));
    },
    { scope: 'worker', auto: true },
  ],

  huntWorkerWorkflowId: [
    async ({ kbnClient }, use) => {
      void kbnClient;
      // The per-space Worker workflow id is `<managed id>-<spaceId>`
      // (managed_workflows_service.resolveWorkflowDocumentId with
      // workflowIdSuffix = spaceId). Scout runs in the default space.
      await use(`${WORKER_WORKFLOW_ID}-default`);
    },
    { scope: 'worker' },
  ],

  huntWatchClient: [
    async ({ kbnClient, esClient, log, huntWorkerWorkflowId, huntWorker }, use) => {
      void huntWorker;
      await use(new HuntWatchClient(kbnClient, log, { huntWorkerWorkflowId, esClient }));
    },
    { scope: 'worker' },
  ],
});
