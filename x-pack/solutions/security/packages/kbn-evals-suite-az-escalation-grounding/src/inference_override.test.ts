/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { mergeFeatureOverride, overrideInferenceFeature } from './inference_override';

const existing = [
  { feature_id: 'other_feature', endpoints: [{ id: 'other-endpoint' }] },
  { feature_id: 'alertzero_reasoning', endpoints: [{ id: 'old-endpoint' }] },
];

describe('mergeFeatureOverride', () => {
  it('returns the other features unchanged', () => {
    expect(mergeFeatureOverride(existing, 'alertzero_reasoning', 'new-endpoint')[0]).toEqual(
      existing[0]
    );
  });

  it('returns the feature routed only to the new endpoint', () => {
    expect(
      mergeFeatureOverride(existing, 'alertzero_reasoning', 'new-endpoint').filter(
        ({ feature_id: id }) => id === 'alertzero_reasoning'
      )
    ).toEqual([{ feature_id: 'alertzero_reasoning', endpoints: [{ id: 'new-endpoint' }] }]);
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
      featureId: 'alertzero_reasoning',
      endpointId: 'new-endpoint',
    });

  const putBodies = (): unknown[] =>
    fetch.mock.calls
      .filter(([, { method }]) => method === 'PUT')
      .map(([, { body }]) => JSON.parse(body));

  it('writes the merged features', async () => {
    await override();
    expect(putBodies()).toEqual([
      { features: mergeFeatureOverride(existing, 'alertzero_reasoning', 'new-endpoint') },
    ]);
  });

  it('restores the previous features', async () => {
    const restore = await override();
    await restore();
    expect(putBodies()[1]).toEqual({ features: existing });
  });
});
