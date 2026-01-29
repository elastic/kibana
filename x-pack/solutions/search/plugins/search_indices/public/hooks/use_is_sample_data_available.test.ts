/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ILicense } from '@kbn/licensing-types';

import useObservable from 'react-use/lib/useObservable';
import { useIsSampleDataAvailable } from './use_is_sample_data_available';
import { useKibana } from './use_kibana';
import { useUserPrivilegesQuery } from './api/use_user_permissions';

jest.mock('./use_kibana');
jest.mock('./api/use_user_permissions');
jest.mock('../utils/indices', () => ({
  generateRandomIndexName: jest.fn(() => 'dummy-index'),
}));
jest.mock('react-use/lib/useObservable');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseUserPrivilegesQuery = useUserPrivilegesQuery as jest.MockedFunction<
  typeof useUserPrivilegesQuery
>;
const mockUseObservable = useObservable as jest.MockedFunction<typeof useObservable>;

const makeLicense = (hasAtLeastResult: boolean): ILicense =>
  ({
    hasAtLeast: jest.fn(() => hasAtLeastResult),
    isAvailable: jest.fn(() => hasAtLeastResult),
    isActive: jest.fn(() => hasAtLeastResult),
  } as unknown as ILicense);

describe('useIsSampleDataAvailable', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        licensing: {
          license$: {} as any,
        },
        sampleDataIngest: {
          minimumLicenseType: 'platinum',
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseUserPrivilegesQuery.mockReturnValue({
      data: { privileges: { canManageIndex: true } },
    } as any);

    mockUseObservable.mockReturnValue(makeLicense(true));
  });

  it('returns isUsageAvailable true when plugin exists, license is sufficient, and user has privileges', () => {
    const { result } = renderHook(() => useIsSampleDataAvailable());

    expect(result.current).toEqual({
      hasPrivileges: true,
      isPluginAvailable: true,
      isUsageAvailable: true,
      hasRequiredLicense: true,
    });
  });

  it('returns hasRequiredLicense false and isAvailable false when license is insufficient', () => {
    mockUseObservable.mockReturnValue(makeLicense(false));

    const { result } = renderHook(() => useIsSampleDataAvailable());

    expect(result.current).toEqual({
      hasPrivileges: true,
      isPluginAvailable: true,
      isUsageAvailable: false,
      hasRequiredLicense: false,
    });
  });

  it('returns isUsageAvailable false when user lacks manage index privilege', () => {
    mockUseUserPrivilegesQuery.mockReturnValue({
      data: { privileges: { canManageIndex: false } },
    } as any);

    const { result } = renderHook(() => useIsSampleDataAvailable());

    expect(result.current).toEqual({
      hasPrivileges: false,
      hasRequiredLicense: true,
      isPluginAvailable: true,
      isUsageAvailable: false,
    });
  });

  it('returns isPluginAvailable false when sampleDataIngest plugin is not available', () => {
    mockUseKibana.mockReturnValue({
      services: {
        licensing: { license$: {} as any },
        sampleDataIngest: undefined,
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useIsSampleDataAvailable());

    expect(result.current).toEqual({
      hasPrivileges: true,
      hasRequiredLicense: true,
      isPluginAvailable: false,
      isUsageAvailable: false,
    });
  });

  it('treats license as sufficient when plugin has no minimumLicenseType, even if license is null', () => {
    mockUseKibana.mockReturnValue({
      services: {
        licensing: { license$: {} as any },
        sampleDataIngest: {
          minimumLicenseType: undefined,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseObservable.mockReturnValue(null);

    mockUseUserPrivilegesQuery.mockReturnValue({
      data: { privileges: { canManageIndex: true } },
    } as any);

    const { result } = renderHook(() => useIsSampleDataAvailable());

    expect(result.current).toEqual({
      hasPrivileges: true,
      hasRequiredLicense: true,
      isPluginAvailable: true,
      isUsageAvailable: true,
    });
  });

  it('handles undefined privileges (loading state) by treating canManageIndex as false', () => {
    mockUseUserPrivilegesQuery.mockReturnValue({
      data: undefined,
    } as any);

    const { result } = renderHook(() => useIsSampleDataAvailable());

    expect(result.current).toEqual({
      hasPrivileges: false,
      hasRequiredLicense: true,
      isPluginAvailable: true,
      isUsageAvailable: false,
    });
  });
});
