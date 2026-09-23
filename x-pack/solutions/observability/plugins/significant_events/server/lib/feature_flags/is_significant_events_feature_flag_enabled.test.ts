/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { isSignificantEventsFeatureFlagEnabled } from './is_significant_events_feature_flag_enabled';

describe('isSignificantEventsFeatureFlagEnabled', () => {
  it('returns false when the feature flag is not enabled', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(false);
    const featureFlags = { getBooleanValue } as unknown as FeatureFlagsStart;

    await expect(isSignificantEventsFeatureFlagEnabled(featureFlags)).resolves.toBe(false);
    expect(getBooleanValue).toHaveBeenCalledWith(NIGHTSHIFT_ENABLED_FLAG, false);
  });

  it('returns true when the feature flag is enabled', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(true);
    const featureFlags = { getBooleanValue } as unknown as FeatureFlagsStart;

    await expect(isSignificantEventsFeatureFlagEnabled(featureFlags)).resolves.toBe(true);
    expect(getBooleanValue).toHaveBeenCalledWith(NIGHTSHIFT_ENABLED_FLAG, false);
  });
});
