/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { renderHook } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { LicenseType } from '@kbn/licensing-types';

import { useLicense } from './use_license';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockLicensing = licensingMock.createStart();

const createKibanaMockWithLicense = (licenseType: LicenseType) => {
  const license = licensingMock.createLicense({
    license: { type: licenseType },
  });

  return {
    services: {
      licensing: {
        ...mockLicensing,
        license$: new BehaviorSubject(license),
      },
    },
  };
};

describe('useLicense', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAtLeastEnterprise', () => {
    it('returns true for an enterprise license', () => {
      mockUseKibana.mockReturnValue(createKibanaMockWithLicense('enterprise') as any);

      const { result } = renderHook(() => useLicense());

      expect(result.current.isAtLeastEnterprise()).toBe(true);
    });

    it('returns false for a gold license', () => {
      mockUseKibana.mockReturnValue(createKibanaMockWithLicense('gold') as any);

      const { result } = renderHook(() => useLicense());

      expect(result.current.isAtLeastEnterprise()).toBe(false);
    });
  });
});
