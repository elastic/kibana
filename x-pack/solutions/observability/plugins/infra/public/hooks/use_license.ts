/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { useCallback } from 'react';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { ILicense, LicenseType } from '@kbn/licensing-plugin/public';
import { useKibanaContextForPlugin } from './use_kibana';

interface UseLicenseReturnValue {
  getLicense: () => ILicense | null;
  hasAtLeast: (level: LicenseType) => boolean | undefined;
}

export const useLicense = (): UseLicenseReturnValue => {
  const { licensing } = useKibanaContextForPlugin().services;
  const license = useObservable<ILicense | null>(licensing?.license$ ?? new Observable(), null);

  return {
    getLicense: () => license,
    hasAtLeast: useCallback(
      (level: LicenseType) => {
        if (!license) return;

        return license.isAvailable && license.isActive && license.hasAtLeast(level);
      },
      [license]
    ),
  };
};

export const useLicenseUrl = () => {
  const { licenseManagement, http } = useKibanaContextForPlugin().services;
  const licensePageUrl = url.format({
    pathname: http.basePath.prepend('/app/management/stack/license_management'),
  });

  return (
    licenseManagement?.locator?.useUrl({
      page: 'dashboard',
    }) || licensePageUrl
  );
};
