/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import {
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';
import { HuntWatchClient } from './harness/hunt_client';
import { ensureHuntWorkerEnabled } from './harness/worker_setup';
import { huntWatchSpaceId } from './harness/space';

// Paths are inlined like the template suite (threat-intel-enrichment): packages
// expose a single public entry point, so subpath imports into the plugins would
// break that boundary. The feature ids come from @kbn/alertzero-common, the same
// constants the hunt resolves its models from (HUNT_MODEL_TIERS in hunt_model_tiers.ts).
const INFERENCE_SETTINGS_URL = '/internal/search_inference_endpoints/settings';
const INFERENCE_FEATURES_URL = '/internal/search_inference_endpoints/features';

/**
 * Every tier a hunt runs on, all pinned to the model under test. Efficient picks the
 * Tier 2 datasets, so leaving it on the stack default would put a second model inside
 * every recall score.
 */
export const HUNT_TIER_FEATURE_IDS: readonly string[] = [
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
];
const TIER_FEATURE_IDS = new Set<string>(HUNT_TIER_FEATURE_IDS);

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

interface InferenceFeaturesResponse {
  features: Array<{ featureId: string }>;
}

/**
 * The settings route stores any feature id without checking it is registered, so
 * a tier rename turns the pin into a silent no-op and every score belongs to the
 * stack default model. Fail the run instead: every hunt tier must be registered,
 * and the stored pick for each must be the model under test.
 */
export const assertTierRegistered = (registeredFeatureIds: string[]): void => {
  const missing = HUNT_TIER_FEATURE_IDS.filter((id) => !registeredFeatureIds.includes(id));
  if (missing.length > 0) {
    throw new Error(
      `[hunt-watch] inference feature(s) ${missing.map((id) => `"${id}"`).join(', ')} not ` +
        `registered on this stack (registered: ${registeredFeatureIds.join(', ') || 'none'}). ` +
        `Pinning would be a no-op and the hunt would run on the stack default model, not the ` +
        `model under test.`
    );
  }
};

export const assertTierPinned = ({
  features,
  expected,
}: {
  features: InferenceFeatureSetting[];
  expected: string;
}): void => {
  for (const featureId of HUNT_TIER_FEATURE_IDS) {
    const actual = features.find((f) => f.feature_id === featureId)?.endpoints[0]?.id;
    if (actual !== expected) {
      throw new Error(
        `[hunt-watch] ${featureId} resolves to endpoint "${actual ?? 'none'}", not the ` +
          `model under test "${expected}". Scores would be attributed to the wrong model.`
      );
    }
  }
};

/**
 * Extends the base `@kbn/evals` fixture with:
 * - `modelSettingsForHuntWatch` (auto, worker-scoped): pins every AlertZero tier
 *   the hunt runs on (Efficient and Frontier) to the model under test, fails the
 *   run if a tier is not registered or its stored pick is not the model under
 *   test. The hunt resolves each tier's model from these settings first and only
 *   then falls back to the stack defaults, so without this the run measures
 *   whatever the stack default is.
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
        `[hunt-watch] Pinning Model Settings ${HUNT_TIER_FEATURE_IDS.join(', ')}=${connector.id}`
      );

      const registered = await kbnClient.request<InferenceFeaturesResponse>({
        path: INFERENCE_FEATURES_URL,
        method: 'GET',
        headers: INTERNAL_API_HEADERS,
      });
      assertTierRegistered((registered.data.features ?? []).map((f) => f.featureId));

      // PUT replaces the whole saved object, so read first and merge: keep every
      // other feature pick and only overwrite the tiers this suite drives.
      const existing = await kbnClient.request<InferenceSettingsResponse>({
        path: INFERENCE_SETTINGS_URL,
        method: 'GET',
        headers: INTERNAL_API_HEADERS,
      });
      const otherFeatures = (existing.data.data?.features ?? []).filter(
        (feature) => !TIER_FEATURE_IDS.has(feature.feature_id)
      );
      const previousFeatures = (existing.data.data?.features ?? []).filter((feature) =>
        TIER_FEATURE_IDS.has(feature.feature_id)
      );

      await kbnClient.request({
        path: INFERENCE_SETTINGS_URL,
        method: 'PUT',
        body: {
          features: [
            ...otherFeatures,
            ...HUNT_TIER_FEATURE_IDS.map((featureId) => ({
              feature_id: featureId,
              endpoints: [{ id: connector.id }],
            })),
          ],
        },
        headers: INTERNAL_API_HEADERS,
      });
      try {
        const pinned = await kbnClient.request<InferenceSettingsResponse>({
          path: INFERENCE_SETTINGS_URL,
          method: 'GET',
          headers: INTERNAL_API_HEADERS,
        });
        assertTierPinned({
          features: pinned.data.data?.features ?? [],
          expected: connector.id,
        });
        await use();
      } finally {
        // Restore the pre-suite picks even when the sweep fails, so later
        // evaluations on this stack keep their own model settings.
        await kbnClient.request({
          path: INFERENCE_SETTINGS_URL,
          method: 'PUT',
          body: { features: [...otherFeatures, ...previousFeatures] },
          headers: INTERNAL_API_HEADERS,
        });
      }
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
      // workflowIdSuffix = spaceId). The default space unless
      // HUNT_WATCH_SPACE_ID pins another one.
      await use(`${WORKER_WORKFLOW_ID}-${huntWatchSpaceId()}`);
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
