/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useHasEntityResolutionLicense } from './use_has_entity_resolution_license';
import { useHasSecurityCapability } from '../../helper_hooks';
import { useLicense } from './use_license';

jest.mock('../../helper_hooks');
jest.mock('./use_license');

describe('useHasEntityResolutionLicense', () => {
  const mockUseHasSecurityCapability = useHasSecurityCapability as jest.Mock;
  const mockUseLicense = useLicense as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when entity-analytics capability is enabled and license is Enterprise', () => {
    mockUseHasSecurityCapability.mockReturnValue(true);
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => true),
    });

    const { result } = renderHook(() => useHasEntityResolutionLicense());

    expect(result.current).toBe(true);
    expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('entity-analytics');
  });

  it('returns false when capability is enabled but license is not Enterprise (e.g. Platinum)', () => {
    mockUseHasSecurityCapability.mockReturnValue(true);
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => false),
    });

    const { result } = renderHook(() => useHasEntityResolutionLicense());

    expect(result.current).toBe(false);
  });

  it('returns false when license is Enterprise but entity-analytics capability is missing', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => true),
    });

    const { result } = renderHook(() => useHasEntityResolutionLicense());

    expect(result.current).toBe(false);
  });

  it('returns false when neither capability nor Enterprise license', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => false),
    });

    const { result } = renderHook(() => useHasEntityResolutionLicense());

    expect(result.current).toBe(false);
  });
});
