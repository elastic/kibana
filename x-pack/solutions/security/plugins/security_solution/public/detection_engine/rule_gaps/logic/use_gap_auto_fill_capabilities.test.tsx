/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGapAutoFillCapabilities } from './use_gap_auto_fill_capabilities';

const mockUseLicense = jest.fn();
const mockUseUserPrivileges = jest.fn();
const mockUseIsExperimentalFeatureEnabled = jest.fn();

jest.mock('../../../common/hooks/use_license', () => ({
  useLicense: () => mockUseLicense(),
}));

jest.mock('../../../common/components/user_privileges', () => ({
  useUserPrivileges: () => mockUseUserPrivileges(),
}));

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => mockUseIsExperimentalFeatureEnabled(),
}));

describe('useGapAutoFillCapabilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserPrivileges.mockReturnValue({
      rulesPrivileges: { read: true, edit: true },
    });
    mockUseLicense.mockReturnValue({
      isEnterprise: () => true,
    });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
  });

  it('returns edit access when license and CRUD permissions are available', () => {
    const { result } = renderHook(() => useGapAutoFillCapabilities());

    expect(result.current.hasEnterpriseLicense).toBe(true);
    expect(result.current.canAccessGapAutoFill).toBe(true);
    expect(result.current.canEditGapAutoFill).toBe(true);
  });

  it('denies access when license is below enterprise', () => {
    mockUseLicense.mockReturnValue({
      isEnterprise: () => false,
    });

    const { result } = renderHook(() => useGapAutoFillCapabilities());

    expect(result.current.hasEnterpriseLicense).toBe(false);
    expect(result.current.canAccessGapAutoFill).toBe(false);
    expect(result.current.canEditGapAutoFill).toBe(false);
  });

  it('denies access when experimental feature flag is disabled', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useGapAutoFillCapabilities());

    expect(result.current.canAccessGapAutoFill).toBe(false);
    expect(result.current.canEditGapAutoFill).toBe(false);
  });

  it('denies edit rights when license is enterprise but user lacks CRUD', () => {
    mockUseLicense.mockReturnValue({
      isEnterprise: () => true,
    });
    mockUseUserPrivileges.mockReturnValue({
      rulesPrivileges: { read: true, edit: false },
    });

    const { result } = renderHook(() => useGapAutoFillCapabilities());

    expect(result.current.canAccessGapAutoFill).toBe(true);
    expect(result.current.canEditGapAutoFill).toBe(false);
  });
});
