/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { useMemo } from 'react';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ILicense } from '@kbn/licensing-types';
import { Observable } from 'rxjs';

export const useGetLicenseInfo = (licensing: LicensingPluginStart) => {
  const license = useObservable<ILicense | null>(licensing?.license$ ?? new Observable(), null);

  const { isTrial, licenseType, hasEnterpriseLicense } = useMemo(
    () => ({
      isTrial: license && license.isAvailable && license.isActive && license.type === 'trial',
      licenseType: license?.type,
      hasEnterpriseLicense: !!(
        license &&
        license.isAvailable &&
        license.isActive &&
        license.hasAtLeast('enterprise')
      ),
    }),
    [license]
  );

  return {
    isTrial,
    licenseType,
    hasEnterpriseLicense,
  };
};
