/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { INFERENCE_SETTINGS_API_VERSION, INFERENCE_SETTINGS_ROUTE } from './constants';

export interface InferenceFeatureSetting {
  feature_id: string;
  endpoints: Array<{ id: string }>;
}

interface InferenceSettingsResponse {
  data: { features: InferenceFeatureSetting[] };
}

/** Returns `features` with `featureId` routed to `endpointId`, keeping every other feature. */
export const mergeFeatureOverride = (
  features: readonly InferenceFeatureSetting[],
  featureId: string,
  endpointId: string
): InferenceFeatureSetting[] => [
  ...features.filter(({ feature_id: id }) => id !== featureId),
  { feature_id: featureId, endpoints: [{ id: endpointId }] },
];

const readFeatures = async (fetch: HttpHandler): Promise<InferenceFeatureSetting[]> => {
  const { data } = (await fetch(INFERENCE_SETTINGS_ROUTE, {
    method: 'GET',
    version: INFERENCE_SETTINGS_API_VERSION,
    headers: { 'elastic-api-version': INFERENCE_SETTINGS_API_VERSION },
  })) as InferenceSettingsResponse;
  return data.features;
};

const writeFeatures = async (
  fetch: HttpHandler,
  features: readonly InferenceFeatureSetting[]
): Promise<void> => {
  await fetch(INFERENCE_SETTINGS_ROUTE, {
    method: 'PUT',
    version: INFERENCE_SETTINGS_API_VERSION,
    headers: { 'elastic-api-version': INFERENCE_SETTINGS_API_VERSION },
    body: JSON.stringify({ features }),
  });
};

/**
 * Routes `featureId` to `endpointId` in the space's inference settings. The PUT replaces
 * the whole document, so this merges into what is there; call the returned function to
 * put the previous document back.
 */
export const overrideInferenceFeature = async ({
  fetch,
  featureId,
  endpointId,
}: {
  fetch: HttpHandler;
  featureId: string;
  endpointId: string;
}): Promise<() => Promise<void>> => {
  const previous = await readFeatures(fetch);
  await writeFeatures(fetch, mergeFeatureOverride(previous, featureId, endpointId));
  return () => writeFeatures(fetch, previous);
};
