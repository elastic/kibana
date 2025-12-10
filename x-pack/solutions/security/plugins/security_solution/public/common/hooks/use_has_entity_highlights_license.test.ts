/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useHasEntityHighlightsLicense } from './use_has_entity_highlights_license';
import { useProductFeatureKeys } from './use_product_feature_keys';
import { useLicense } from './use_license';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';

jest.mock('./use_product_feature_keys');
jest.mock('./use_license');

describe('useHasEntityHighlightsLicense', () => {
  const mockUseProductFeatureKeys = useProductFeatureKeys as jest.Mock;
  const mockUseLicense = useLicense as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when both PLI feature is enabled and user has Enterprise-level feature', () => {
    mockUseProductFeatureKeys.mockReturnValue(
      new Set<string>([ProductFeatureSecurityKey.advancedInsights])
    );

    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => true),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(true);
  });

  it('should return false when user has advancedInsights feature but NOT Enterprise license', () => {
    mockUseProductFeatureKeys.mockReturnValue(
      new Set<string>([ProductFeatureSecurityKey.advancedInsights])
    );

    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => false),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(false);
  });

  it('should return false when user has Enterprise license but NOT advancedInsights feature', () => {
    mockUseProductFeatureKeys.mockReturnValue(new Set<string>([]));

    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => true),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(false);
  });

  it('should return false when user has neither advancedInsights feature nor Enterprise license', () => {
    mockUseProductFeatureKeys.mockReturnValue(new Set<string>([]));

    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => false),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(false);
  });
});
