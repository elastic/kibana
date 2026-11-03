/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { INFERENCE_SETTINGS_API_VERSION, INFERENCE_SETTINGS_ROUTE } from './constants';
import { apiVersion, spacePath } from './kibana_api';

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

export const readFeatures = async (
  fetch: HttpHandler,
  spaceId: string
): Promise<InferenceFeatureSetting[]> => {
  const { data } = (await fetch(spacePath(spaceId, INFERENCE_SETTINGS_ROUTE), {
    method: 'GET',
    headers: apiVersion(INFERENCE_SETTINGS_API_VERSION),
  })) as InferenceSettingsResponse;
  return data.features;
};

/** The PUT replaces the whole settings document. */
export const writeFeatures = async (
  fetch: HttpHandler,
  spaceId: string,
  features: readonly InferenceFeatureSetting[]
): Promise<void> => {
  await fetch(spacePath(spaceId, INFERENCE_SETTINGS_ROUTE), {
    method: 'PUT',
    headers: apiVersion(INFERENCE_SETTINGS_API_VERSION),
    body: JSON.stringify({ features }),
  });
};
