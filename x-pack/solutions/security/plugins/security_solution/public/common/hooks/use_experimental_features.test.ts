/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { useIsExperimentalFeatureEnabled } from './use_experimental_features';

jest.mock('../../../common/experimental_features', () => ({
  allowedExperimentalValues: {
    featureA: true,
    featureB: false,
  },
  getExperimentalAllowedValuesKeys: jest.fn(),
}));

describe('useExperimentalFeatures', () => {
  it('throws an error when unexisting feature', async () => {
    expect(() =>
      useIsExperimentalFeatureEnabled('unexistingFeature' as keyof ExperimentalFeatures)
    ).toThrowError();
  });

  it('returns true when existing feature and is enabled', async () => {
    const result = useIsExperimentalFeatureEnabled('featureA' as keyof ExperimentalFeatures);

    expect(result).toBeTruthy();
  });

  it('returns false when existing feature and is disabled', async () => {
    const result = useIsExperimentalFeatureEnabled('featureB' as keyof ExperimentalFeatures);

    expect(result).toBeFalsy();
  });
});
