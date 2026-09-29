/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useHasEntityResolutionLicense } from './use_has_entity_resolution_license';
import { useHasSecurityCapability } from '../../helper_hooks';
import { useLicense } from './use_license';

vi.mock('../../helper_hooks');
vi.mock('./use_license');

describe('useHasEntityResolutionLicense', () => {
  const mockUseHasSecurityCapability = useHasSecurityCapability as Mock;
  const mockUseLicense = useLicense as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when entity-analytics capability is enabled and license is Enterprise', () => {
    mockUseHasSecurityCapability.mockReturnValue(true);
    mockUseLicense.mockReturnValue({
      isEnterprise: vi.fn(() => true),
    });

    const { result } = renderHook(() => useHasEntityResolutionLicense());

    expect(result.current).toBe(true);
    expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('entity-analytics');
  });

  it('returns false when capability is enabled but license is not Enterprise (e.g. Platinum)', () => {
    mockUseHasSecurityCapability.mockReturnValue(true);
    mockUseLicense.mockReturnValue({
      isEnterprise: vi.fn(() => false),
    });

    const { result } = renderHook(() => useHasEntityResolutionLicense());

    expect(result.current).toBe(false);
  });

  it('returns false when license is Enterprise but entity-analytics capability is missing', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);
    mockUseLicense.mockReturnValue({
      isEnterprise: vi.fn(() => true),
    });

    const { result } = renderHook(() => useHasEntityResolutionLicense());

    expect(result.current).toBe(false);
  });

  it('returns false when neither capability nor Enterprise license', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);
    mockUseLicense.mockReturnValue({
      isEnterprise: vi.fn(() => false),
    });

    const { result } = renderHook(() => useHasEntityResolutionLicense());

    expect(result.current).toBe(false);
  });
});
