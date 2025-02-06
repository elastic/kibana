/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useInvestigateFeatureFlag } from './use_investigate_feature_flag';
import { useKibana } from '../../../utils/kibana_react';
import { BehaviorSubject } from 'rxjs';

// Mock useKibana hook
jest.mock('../../../utils/kibana_react');

describe('useInvestigateFeatureFlag', () => {
  let featureFlags: { getBooleanValue$: jest.Mock };

  beforeEach(() => {
    featureFlags = {
      getBooleanValue$: jest.fn(),
    };

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        featureFlags,
      },
    });
  });

  it('should return true when the feature flag is enabled', () => {
    const featureFlagSubject = new BehaviorSubject(true);
    featureFlags.getBooleanValue$.mockReturnValue(featureFlagSubject);

    const { result } = renderHook(() => useInvestigateFeatureFlag());

    expect(result.current).toBe(true);
  });

  it('should return false when the feature flag is disabled', () => {
    const featureFlagSubject = new BehaviorSubject(false);
    featureFlags.getBooleanValue$.mockReturnValue(featureFlagSubject);

    const { result } = renderHook(() => useInvestigateFeatureFlag());

    expect(result.current).toBe(false);
  });

  it('should unsubscribe from the feature flag observable on unmount', () => {
    const unsubscribe = jest.fn();
    const featureFlagSubject = {
      subscribe: jest.fn(() => ({ unsubscribe })),
    };
    featureFlags.getBooleanValue$.mockReturnValue(featureFlagSubject);

    const { unmount } = renderHook(() => useInvestigateFeatureFlag());

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
