/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ILicense } from '@kbn/licensing-types';
import useObservable from 'react-use/lib/useObservable';

import { useGetLicenseInfo } from './use_get_license_info';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');
jest.mock('react-use/lib/useObservable');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseObservable = useObservable as jest.MockedFunction<typeof useObservable>;

const makeLicense = (
  overrides: Partial<{
    type: ILicense['type'];
    isAvailable: boolean;
    isActive: boolean;
    hasAtLeastEnterprise: boolean;
  }> = {}
): ILicense => {
  const {
    type = 'basic',
    isAvailable = true,
    isActive = true,
    hasAtLeastEnterprise = false,
  } = overrides;
  return {
    type,
    isAvailable,
    isActive,
    hasAtLeast: jest.fn((level: string) => (level === 'enterprise' ? hasAtLeastEnterprise : false)),
  } as unknown as ILicense;
};

const makeKibanaMock = (cloudOverrides?: {
  isCloudEnabled?: boolean;
  isInTrial?: () => boolean;
}) => {
  const cloud = cloudOverrides
    ? {
        isCloudEnabled: cloudOverrides.isCloudEnabled ?? false,
        isInTrial: cloudOverrides.isInTrial ?? (() => false),
      }
    : undefined;

  return {
    services: {
      licensing: { license$: {} as any },
      cloud,
    },
  } as unknown as ReturnType<typeof useKibana>;
};

describe('useGetLicenseInfo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Default: no cloud, basic license
    mockUseKibana.mockReturnValue(makeKibanaMock());
    mockUseObservable.mockReturnValue(makeLicense());
  });

  describe('null license (loading / unavailable state)', () => {
    it('returns safe defaults when license observable has not emitted yet', () => {
      mockUseObservable.mockReturnValue(null);

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current).toEqual({
        isTrial: false,
        licenseType: 'basic',
        hasEnterpriseLicense: false,
      });
    });
  });

  describe('cloud-based trial detection', () => {
    it('returns isTrial true when cloud is enabled and isInTrial returns true', () => {
      mockUseKibana.mockReturnValue(
        makeKibanaMock({ isCloudEnabled: true, isInTrial: () => true })
      );
      mockUseObservable.mockReturnValue(makeLicense({ type: 'enterprise' }));

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.isTrial).toBe(true);
      expect(result.current.licenseType).toBe('trial');
    });

    it('returns isTrial false when cloud is enabled but isInTrial returns false', () => {
      mockUseKibana.mockReturnValue(
        makeKibanaMock({ isCloudEnabled: true, isInTrial: () => false })
      );
      mockUseObservable.mockReturnValue(makeLicense({ type: 'enterprise' }));

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.isTrial).toBe(false);
      expect(result.current.licenseType).toBe('enterprise');
    });

    it('falls back to license when cloud isInTrial is false', () => {
      mockUseKibana.mockReturnValue(
        makeKibanaMock({ isCloudEnabled: true, isInTrial: () => false })
      );
      // License says "trial" but cloud says not in trial
      mockUseObservable.mockReturnValue(
        makeLicense({ type: 'trial', isAvailable: true, isActive: true })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.isTrial).toBe(true);
      expect(result.current.licenseType).toBe('trial'); // type still comes from license
    });
  });

  describe('license-based trial detection (no cloud)', () => {
    it('returns isTrial true when license type is trial, available, and active', () => {
      mockUseObservable.mockReturnValue(
        makeLicense({ type: 'trial', isAvailable: true, isActive: true })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.isTrial).toBe(true);
      expect(result.current.licenseType).toBe('trial');
    });

    it('returns isTrial false when license type is trial but isActive is false', () => {
      mockUseObservable.mockReturnValue(
        makeLicense({ type: 'trial', isAvailable: true, isActive: false })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.isTrial).toBe(false);
    });

    it('returns isTrial false when license type is trial but isAvailable is false', () => {
      mockUseObservable.mockReturnValue(
        makeLicense({ type: 'trial', isAvailable: false, isActive: true })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.isTrial).toBe(false);
    });

    it('returns isTrial false for a non-trial license type', () => {
      mockUseObservable.mockReturnValue(
        makeLicense({ type: 'platinum', isAvailable: true, isActive: true })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.isTrial).toBe(false);
      expect(result.current.licenseType).toBe('platinum');
    });

    it('returns isTrial false when cloud is undefined and license is null', () => {
      mockUseObservable.mockReturnValue(null);

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.isTrial).toBe(false);
    });
  });

  describe('licenseType field', () => {
    it('returns the license type from the license object when not in trial', () => {
      mockUseObservable.mockReturnValue(makeLicense({ type: 'gold' }));

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.licenseType).toBe('gold');
    });

    it('returns "trial" as licenseType when isTrial is true', () => {
      mockUseObservable.mockReturnValue(
        makeLicense({ type: 'trial', isAvailable: true, isActive: true })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.licenseType).toBe('trial');
    });

    it('falls back to "basic" when license is null and not in trial', () => {
      mockUseObservable.mockReturnValue(null);

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.licenseType).toBe('basic');
    });

    it('uses "trial" as licenseType when cloud reports in-trial, regardless of license type', () => {
      mockUseKibana.mockReturnValue(
        makeKibanaMock({ isCloudEnabled: true, isInTrial: () => true })
      );
      mockUseObservable.mockReturnValue(null);

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.licenseType).toBe('trial');
    });
  });

  describe('hasEnterpriseLicense field', () => {
    it('returns true when license is available, active, and hasAtLeast("enterprise") is true', () => {
      mockUseObservable.mockReturnValue(
        makeLicense({ isAvailable: true, isActive: true, hasAtLeastEnterprise: true })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.hasEnterpriseLicense).toBe(true);
    });

    it('returns false when hasAtLeast("enterprise") returns false', () => {
      mockUseObservable.mockReturnValue(
        makeLicense({ isAvailable: true, isActive: true, hasAtLeastEnterprise: false })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.hasEnterpriseLicense).toBe(false);
    });

    it('returns false when license is not available', () => {
      mockUseObservable.mockReturnValue(
        makeLicense({ isAvailable: false, isActive: true, hasAtLeastEnterprise: true })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.hasEnterpriseLicense).toBe(false);
    });

    it('returns false when license is not active', () => {
      mockUseObservable.mockReturnValue(
        makeLicense({ isAvailable: true, isActive: false, hasAtLeastEnterprise: true })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.hasEnterpriseLicense).toBe(false);
    });

    it('returns false when license is null', () => {
      mockUseObservable.mockReturnValue(null);

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.hasEnterpriseLicense).toBe(false);
    });
  });

  describe('cloud service absent', () => {
    it('falls back to license-based checks when cloud service is not provided', () => {
      mockUseKibana.mockReturnValue(makeKibanaMock()); // cloud = undefined
      mockUseObservable.mockReturnValue(
        makeLicense({ type: 'trial', isAvailable: true, isActive: true })
      );

      const { result } = renderHook(() => useGetLicenseInfo());

      expect(result.current.isTrial).toBe(true);
      expect(result.current.licenseType).toBe('trial');
    });
  });
});
