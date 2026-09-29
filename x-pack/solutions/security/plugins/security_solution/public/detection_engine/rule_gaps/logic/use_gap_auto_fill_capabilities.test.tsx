/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { useGapAutoFillCapabilities } from './use_gap_auto_fill_capabilities';

const mockUseLicense = vi.fn();
const mockUseUserPrivileges = vi.fn();
const mockUseIsExperimentalFeatureEnabled = vi.fn();
const mockUseProductFeatureKeys = vi.fn();

vi.mock('../../../common/hooks/use_license', () => {
      const mocked = {
      useLicense: () => mockUseLicense(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/components/user_privileges', () => {
      const mocked = {
      useUserPrivileges: () => mockUseUserPrivileges(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/hooks/use_experimental_features', () => {
      const mocked = {
      useIsExperimentalFeatureEnabled: () => mockUseIsExperimentalFeatureEnabled(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/hooks/use_product_feature_keys', () => {
      const mocked = {
      useProductFeatureKeys: () => mockUseProductFeatureKeys(),
    };
      return { ...mocked, default: mocked };
    });

describe('useGapAutoFillCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserPrivileges.mockReturnValue({
      rulesPrivileges: {
        rules: { read: true, edit: false },
        rulesManagementSettings: { edit: true },
      },
    });
    mockUseLicense.mockReturnValue({
      isEnterprise: () => true,
    });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    mockUseProductFeatureKeys.mockReturnValue(
      new Set<string>([ProductFeatureSecurityKey.ruleGapsAutoFill])
    );
  });

  it('returns edit access when license and rules_management_settings permissions are available', () => {
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

  it('denies edit rights when license is enterprise but user lacks rules_management_settings', () => {
    mockUseLicense.mockReturnValue({
      isEnterprise: () => true,
    });
    mockUseUserPrivileges.mockReturnValue({
      rulesPrivileges: {
        rules: { read: true, edit: false },
        rulesManagementSettings: { edit: true },
      },
    });

    const { result } = renderHook(() => useGapAutoFillCapabilities());

    expect(result.current.canAccessGapAutoFill).toBe(true);
    expect(result.current.canEditGapAutoFill).toBe(true);
  });

  it('denies access when rule gaps auto-fill feature is disabled', () => {
    mockUseProductFeatureKeys.mockReturnValue(new Set<string>());

    const { result } = renderHook(() => useGapAutoFillCapabilities());

    expect(result.current.canAccessGapAutoFill).toBe(false);
    expect(result.current.canEditGapAutoFill).toBe(false);
  });
});
