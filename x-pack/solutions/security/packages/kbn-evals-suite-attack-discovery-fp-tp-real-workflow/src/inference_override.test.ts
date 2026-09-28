/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import {
  FP_TP_INFERENCE_FEATURE_ID,
  INFERENCE_SETTINGS_API_VERSION,
  INFERENCE_SETTINGS_ROUTE,
} from './constants';
import {
  mergeFeatureOverride,
  overrideInferenceFeature,
  type InferenceFeatureSetting,
} from './inference_override';

const existing: InferenceFeatureSetting[] = [
  { feature_id: 'other_feature', endpoints: [{ id: 'other-endpoint' }] },
  { feature_id: FP_TP_INFERENCE_FEATURE_ID, endpoints: [{ id: 'old-endpoint' }] },
];

describe('mergeFeatureOverride', () => {
  it('returns the other features unchanged', () => {
    expect(mergeFeatureOverride(existing, FP_TP_INFERENCE_FEATURE_ID, 'new-endpoint')[0]).toEqual(
      existing[0]
    );
  });

  it('routes the feature only to the new endpoint', () => {
    expect(
      mergeFeatureOverride(existing, FP_TP_INFERENCE_FEATURE_ID, 'new-endpoint').filter(
        ({ feature_id: id }) => id === FP_TP_INFERENCE_FEATURE_ID
      )
    ).toEqual([{ feature_id: FP_TP_INFERENCE_FEATURE_ID, endpoints: [{ id: 'new-endpoint' }] }]);
  });
});

describe('overrideInferenceFeature', () => {
  let fetch: jest.Mock;

  beforeEach(() => {
    fetch = jest.fn(async (_path: string, { method }: { method: string }) =>
      method === 'GET' ? { data: { features: existing } } : undefined
    );
  });

  const override = () =>
    overrideInferenceFeature({
      fetch: fetch as unknown as HttpHandler,
      featureId: FP_TP_INFERENCE_FEATURE_ID,
      endpointId: 'new-endpoint',
    });

  const calls = (method: string) =>
    fetch.mock.calls.filter(([, { method: callMethod }]) => callMethod === method);

  const putBodies = (): unknown[] => calls('PUT').map(([, { body }]) => JSON.parse(body));

  it('reads the current settings from the inference settings route', async () => {
    await override();
    expect(calls('GET')).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      INFERENCE_SETTINGS_ROUTE,
      expect.objectContaining({
        method: 'GET',
        version: INFERENCE_SETTINGS_API_VERSION,
        headers: { 'elastic-api-version': INFERENCE_SETTINGS_API_VERSION },
      })
    );
  });

  it('routes the feature to the given connector via a PUT to the same route', async () => {
    await override();
    expect(calls('PUT')).toHaveLength(1);
    expect(calls('PUT')[0][0]).toBe(INFERENCE_SETTINGS_ROUTE);
    expect(putBodies()).toEqual([
      {
        features: [
          { feature_id: 'other_feature', endpoints: [{ id: 'other-endpoint' }] },
          { feature_id: FP_TP_INFERENCE_FEATURE_ID, endpoints: [{ id: 'new-endpoint' }] },
        ],
      },
    ]);
  });

  it('restores the previous settings when teardown runs', async () => {
    const restore = await override();
    await restore();
    expect(putBodies()).toHaveLength(2);
    expect(putBodies()[1]).toEqual({ features: existing });
  });
});
