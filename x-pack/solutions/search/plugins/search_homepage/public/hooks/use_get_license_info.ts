/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';

export const useGetLicenseInfo = () => {
  const {
    services: { licensing, cloud },
  } = useKibana();

  const license = useObservable(licensing.license$, null);

  const { isTrial, licenseType, hasEnterpriseLicense } = useMemo(() => {
    const isInTrial =
      cloud?.isCloudEnabled && cloud.isInTrial()
        ? true
        : license && license.isAvailable && license.isActive && license.type === 'trial';
    return {
      isTrial: isInTrial ?? false,
      licenseType: isInTrial ? 'trial' : license?.type ?? 'basic',
      hasEnterpriseLicense: !!(
        license &&
        license.isAvailable &&
        license.isActive &&
        license.hasAtLeast('enterprise')
      ),
    };
  }, [cloud, license]);

  return {
    isTrial,
    licenseType,
    hasEnterpriseLicense,
  };
};
