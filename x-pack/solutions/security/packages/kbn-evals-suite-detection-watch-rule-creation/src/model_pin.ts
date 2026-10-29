/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

// Paths and feature ids are inlined rather than imported from plugins: packages expose a single
// public entry point (same pattern as kbn-evals-suite-threat-intel-enrichment).
export const INFERENCE_SETTINGS_ROUTE = '/internal/search_inference_endpoints/settings';

const INFERENCE_SETTINGS_HEADERS = {
  'elastic-api-version': '1',
  'x-elastic-internal-origin': 'Kibana',
} as const;

/**
 * Every inference feature a rule-creation run resolves a model through. `draft_creation`
 * resolves `connector-id-by-feature: alertzero_frontier`, and every alertzero tier registers
 * `ignoreGlobalDefault: true`: unpinned, the draft runs the tier's first recommended endpoint
 * (claude-5-opus) whatever the candidate is, while the score docs name the candidate. The agent
 * run's own low-effort calls go through `agent_builder_fast`.
 */
export const PINNED_INFERENCE_FEATURE_IDS = [
  'alertzero_frontier',
  'agent_builder',
  'agent_builder_fast',
] as const;

interface InferenceFeatureSetting {
  feature_id: string;
  endpoints: Array<{ id: string }>;
}

export interface InferenceSettingsClient {
  request<T>(params: {
    path: string;
    method: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<{ data: T }>;
}

const readFeatures = async (
  kbnClient: InferenceSettingsClient
): Promise<InferenceFeatureSetting[]> => {
  const { data } = await kbnClient.request<{ data?: { features?: InferenceFeatureSetting[] } }>({
    path: INFERENCE_SETTINGS_ROUTE,
    method: 'GET',
    headers: { ...INFERENCE_SETTINGS_HEADERS },
  });
  return data?.data?.features ?? [];
};

/**
 * Point every feature in `featureIds` at the eval connector. The PUT replaces the whole document,
 * so picks for other features are merged in. The read-back is the assertion.
 */
export const pinInferenceFeatures = async ({
  kbnClient,
  connectorId,
  log,
  featureIds = PINNED_INFERENCE_FEATURE_IDS,
}: {
  kbnClient: InferenceSettingsClient;
  connectorId: string | undefined;
  log: ToolingLog;
  featureIds?: readonly string[];
}): Promise<void> => {
  if (!connectorId) {
    throw new Error(
      `Cannot pin inference features ${featureIds.join(', ')}: the eval connector has no id.`
    );
  }
  const pinned = new Set<string>(featureIds);
  const existing = await readFeatures(kbnClient);

  await kbnClient.request({
    path: INFERENCE_SETTINGS_ROUTE,
    method: 'PUT',
    headers: { ...INFERENCE_SETTINGS_HEADERS },
    body: {
      features: [
        ...existing.filter(({ feature_id: id }) => !pinned.has(id)),
        ...featureIds.map((featureId) => ({
          feature_id: featureId,
          endpoints: [{ id: connectorId }],
        })),
      ],
    },
  });

  const after = await readFeatures(kbnClient);
  const unpinned = featureIds.filter((featureId) => {
    const endpoints = after.find(({ feature_id: id }) => id === featureId)?.endpoints ?? [];
    return endpoints.length !== 1 || endpoints[0].id !== connectorId;
  });
  if (unpinned.length > 0) {
    throw new Error(
      `Inference settings did not stick for ${unpinned.join(', ')}: expected endpoint ` +
        `"${connectorId}". Those features would run their recommended endpoint instead.`
    );
  }

  log.info(`Inference features ${featureIds.join(', ')} pinned to ${connectorId}`);
};
