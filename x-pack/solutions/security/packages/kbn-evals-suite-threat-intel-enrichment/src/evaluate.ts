/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { ThreatIntelClient } from './clients/threat_intel_client';

// Paths and feature ids are inlined rather than imported from plugins/packages:
// packages expose a single public entry point, and this suite already follows
// that pattern for the threat_intel routes.
const INFERENCE_SETTINGS_URL = '/internal/search_inference_endpoints/settings';
const ALERTZERO_FAST_FEATURE_ID = 'alertzero_fast';
const ALERTZERO_REASONING_FEATURE_ID = 'alertzero_reasoning';

const TIER_FEATURE_IDS = new Set([ALERTZERO_FAST_FEATURE_ID, ALERTZERO_REASONING_FEATURE_ID]);

const INTERNAL_API_HEADERS = {
  'elastic-api-version': '1',
  'x-elastic-internal-origin': 'Kibana',
};

interface InferenceFeatureSetting {
  feature_id: string;
  endpoints: Array<{ id: string }>;
}

interface InferenceSettingsResponse {
  data: { features: InferenceFeatureSetting[] };
}

/**
 * Extends the base `@kbn/evals` fixture with a worker-scoped `ThreatIntelClient`
 * that posts directly to the threat_intel enrichment routes, plus an auto
 * fixture that pins AlertZero Fast/Reasoning Model Settings to the model under
 * test. Everything else (executorClient, inferenceClient, connector, evaluators,
 * log) comes from the base fixture unchanged.
 */
export const evaluate = base.extend<
  {},
  {
    threatIntelClient: ThreatIntelClient;
    modelSettingsForThreatIntel: void;
  }
>({
  modelSettingsForThreatIntel: [
    async ({ kbnClient, connector, log }, use) => {
      log.info(
        `[threat-intel-evals] Pinning Model Settings ` +
          `${ALERTZERO_FAST_FEATURE_ID}/${ALERTZERO_REASONING_FEATURE_ID}=${connector.id}`
      );

      // PUT replaces the whole SO, so read first and merge: keep every other
      // feature pick (Agentic, Agent Builder, etc.) and only overwrite the two
      // tiers this suite drives.
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
            {
              feature_id: ALERTZERO_FAST_FEATURE_ID,
              endpoints: [{ id: connector.id }],
            },
            {
              feature_id: ALERTZERO_REASONING_FEATURE_ID,
              endpoints: [{ id: connector.id }],
            },
          ],
        },
        headers: INTERNAL_API_HEADERS,
      });
      await use();
    },
    { scope: 'worker', auto: true },
  ],

  threatIntelClient: [
    async ({ kbnClient, log, modelSettingsForThreatIntel }, use) => {
      await use(new ThreatIntelClient(kbnClient, log));
    },
    { scope: 'worker' },
  ],
});
