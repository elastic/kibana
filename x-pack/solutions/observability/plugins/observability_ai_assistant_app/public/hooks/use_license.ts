/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense, LicenseType } from '@kbn/licensing-plugin/public';
import { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from './use_kibana';

interface UseLicenseReturnValue {
  getLicense: () => ILicense | null;
  hasAtLeast: (level: LicenseType) => boolean | undefined;
}

export const useLicense = (): UseLicenseReturnValue => {
  const {
    services: {
      plugins: {
        start: { licensing },
      },
    },
  } = useKibana();

  const license = useObservable<ILicense | null>(licensing.license$);

  return {
    getLicense: () => license ?? null,
    hasAtLeast: useCallback(
      (level: LicenseType) => {
        if (!license) return;

        return !!license && license.isAvailable && license.isActive && license.hasAtLeast(level);
      },
      [license]
    ),
  };
};
