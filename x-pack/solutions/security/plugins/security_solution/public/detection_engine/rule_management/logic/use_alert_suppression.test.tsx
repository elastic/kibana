/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import * as useIsExperimentalFeatureEnabledMock from '../../../common/hooks/use_experimental_features';
import { useAlertSuppression } from './use_alert_suppression';

describe('useAlertSuppression', () => {
  jest
    .spyOn(useIsExperimentalFeatureEnabledMock, 'useIsExperimentalFeatureEnabled')
    .mockReturnValue(false);
  it(`should return the isSuppressionEnabled true if query for all rule types is not an eql sequence query`, () => {
    const { result } = renderHook(() => useAlertSuppression());
    expect(result.current.isSuppressionEnabled).toBe(true);
  });

  jest
    .spyOn(useIsExperimentalFeatureEnabledMock, 'useIsExperimentalFeatureEnabled')
    .mockReturnValue(false);
  it('should return isSuppressionEnabled false for eql sequence query when feature flag is disabled', () => {
    const { result } = renderHook(() => useAlertSuppression(true));
    expect(result.current.isSuppressionEnabled).toBe(false);
  });
});
