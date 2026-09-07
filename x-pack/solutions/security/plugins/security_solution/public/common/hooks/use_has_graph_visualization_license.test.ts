/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useHasGraphVisualizationLicense } from './use_has_graph_visualization_license';
import { useProductFeatureKeys } from './use_product_feature_keys';
import { useLicense } from './use_license';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';

jest.mock('./use_product_feature_keys');
jest.mock('./use_license');

describe('useHasGraphVisualizationLicense', () => {
  const mockUseProductFeatureKeys = useProductFeatureKeys as jest.Mock;
  const mockUseLicense = useLicense as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when both PLI feature is enabled and user has Platinum-level feature', () => {
    // In Serverless Complete tier, both checks are true:
    // - PLI feature check returns true
    // - Platinum-level features are available (treated as "Platinum" for license purposes)
    // In ESS/Self-Managed with Platinum license, both checks are true:
    // - PLI feature check passes (Platinum includes all features)
    // - License check passes (user has Platinum license)
    mockUseProductFeatureKeys.mockReturnValue(
      new Set<string>([ProductFeatureSecurityKey.graphVisualization])
    );

    mockUseLicense.mockReturnValue({
      isPlatinumPlus: jest.fn(() => true),
    });

    const { result } = renderHook(() => useHasGraphVisualizationLicense());

    expect(result.current).toBe(true);
  });

  it('should return false when user has graphVisualization feature but NOT Platinum license', () => {
    mockUseProductFeatureKeys.mockReturnValue(
      new Set<string>([ProductFeatureSecurityKey.graphVisualization])
    );

    mockUseLicense.mockReturnValue({
      isPlatinumPlus: jest.fn(() => false),
    });

    const { result } = renderHook(() => useHasGraphVisualizationLicense());

    expect(result.current).toBe(false);
  });

  it('should return false when user has Platinum license but NOT graphVisualization feature', () => {
    mockUseProductFeatureKeys.mockReturnValue(new Set<string>([]));

    mockUseLicense.mockReturnValue({
      isPlatinumPlus: jest.fn(() => true),
    });

    const { result } = renderHook(() => useHasGraphVisualizationLicense());

    expect(result.current).toBe(false);
  });

  it('should return false when user has neither graphVisualization feature nor Platinum license', () => {
    mockUseProductFeatureKeys.mockReturnValue(new Set<string>([]));

    mockUseLicense.mockReturnValue({
      isPlatinumPlus: jest.fn(() => false),
    });

    const { result } = renderHook(() => useHasGraphVisualizationLicense());

    expect(result.current).toBe(false);
  });

  it('should return false when productFeatureKeys is empty', () => {
    mockUseProductFeatureKeys.mockReturnValue(new Set<string>([]));

    mockUseLicense.mockReturnValue({
      isPlatinumPlus: jest.fn(() => true),
    });

    const { result } = renderHook(() => useHasGraphVisualizationLicense());

    expect(result.current).toBe(false);
  });
});
