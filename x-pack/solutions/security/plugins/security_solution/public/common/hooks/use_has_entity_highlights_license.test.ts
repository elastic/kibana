/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useHasEntityHighlightsLicense } from './use_has_entity_highlights_license';
import { useHasSecurityCapability } from '../../helper_hooks';
import { useLicense } from './use_license';

jest.mock('../../helper_hooks');
jest.mock('./use_license');

describe('useHasEntityHighlightsLicense', () => {
  const mockUseHasSecurityCapability = useHasSecurityCapability as jest.Mock;
  const mockUseLicense = useLicense as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when both entity-analytics capability is enabled and user has Enterprise license', () => {
    mockUseHasSecurityCapability.mockReturnValue(true);

    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => true),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(true);
    expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('entity-analytics');
  });

  it('should return false when user has entity-analytics capability but NOT Enterprise license', () => {
    mockUseHasSecurityCapability.mockReturnValue(true);

    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => false),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(false);
    expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('entity-analytics');
  });

  it('should return false when user has Enterprise license but NOT entity-analytics capability', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);

    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => true),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(false);
    expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('entity-analytics');
  });

  it('should return false when user has neither entity-analytics capability nor Enterprise license', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);

    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => false),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(false);
    expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('entity-analytics');
  });
});
