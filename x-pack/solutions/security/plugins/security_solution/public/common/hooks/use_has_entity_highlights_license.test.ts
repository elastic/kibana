/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useHasEntityHighlightsLicense } from './use_has_entity_highlights_license';
import { useHasSecurityCapability } from '../../helper_hooks';
import { useLicense } from './use_license';

vi.mock('../../helper_hooks');
vi.mock('./use_license');

describe('useHasEntityHighlightsLicense', () => {
  const mockUseHasSecurityCapability = useHasSecurityCapability as Mock;
  const mockUseLicense = useLicense as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when both entity-analytics capability is enabled and user has Enterprise license', () => {
    mockUseHasSecurityCapability.mockReturnValue(true);

    mockUseLicense.mockReturnValue({
      isEnterprise: vi.fn(() => true),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(true);
    expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('entity-analytics');
  });

  it('should return false when user has entity-analytics capability but NOT Enterprise license', () => {
    mockUseHasSecurityCapability.mockReturnValue(true);

    mockUseLicense.mockReturnValue({
      isEnterprise: vi.fn(() => false),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(false);
    expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('entity-analytics');
  });

  it('should return false when user has Enterprise license but NOT entity-analytics capability', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);

    mockUseLicense.mockReturnValue({
      isEnterprise: vi.fn(() => true),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(false);
    expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('entity-analytics');
  });

  it('should return false when user has neither entity-analytics capability nor Enterprise license', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);

    mockUseLicense.mockReturnValue({
      isEnterprise: vi.fn(() => false),
    });

    const { result } = renderHook(() => useHasEntityHighlightsLicense());

    expect(result.current).toBe(false);
    expect(mockUseHasSecurityCapability).toHaveBeenCalledWith('entity-analytics');
  });
});
