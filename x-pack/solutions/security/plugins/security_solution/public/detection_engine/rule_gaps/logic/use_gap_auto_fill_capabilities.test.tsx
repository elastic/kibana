/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGapAutoFillCapabilities } from './use_gap_auto_fill_capabilities';

const mockUseLicense = jest.fn();
const mockUseUserData = jest.fn();

jest.mock('../../../common/hooks/use_license', () => ({
  useLicense: () => mockUseLicense(),
}));

jest.mock('../../../detections/components/user_info', () => ({
  useUserData: () => mockUseUserData(),
}));

describe('useGapAutoFillCapabilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserData.mockReturnValue([{ canUserCRUD: true }, jest.fn()]);
    mockUseLicense.mockReturnValue({
      isPlatinumPlus: () => true,
    });
  });

  it('returns edit access when license and CRUD permissions are available', () => {
    const { result } = renderHook(() => useGapAutoFillCapabilities());

    expect(result.current.canAccessGapAutoFill).toBe(true);
    expect(result.current.canEditGapAutoFill).toBe(true);
  });

  it('denies access when license is below platinum', () => {
    mockUseLicense.mockReturnValue({
      isPlatinumPlus: () => false,
    });

    const { result } = renderHook(() => useGapAutoFillCapabilities());

    expect(result.current.canAccessGapAutoFill).toBe(false);
    expect(result.current.canEditGapAutoFill).toBe(false);
  });

  it('denies edit rights when license is platinum but user lacks CRUD', () => {
    mockUseLicense.mockReturnValue({
      isPlatinumPlus: () => true,
    });
    mockUseUserData.mockReturnValue([{ canUserCRUD: false }, jest.fn()]);

    const { result } = renderHook(() => useGapAutoFillCapabilities());

    expect(result.current.canAccessGapAutoFill).toBe(true);
    expect(result.current.canEditGapAutoFill).toBe(false);
  });
});
