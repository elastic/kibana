/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ILicense } from '@kbn/licensing-types';
import useObservable from 'react-use/lib/useObservable';
import { generateRandomIndexName } from '../utils/indices';
import { useUserPrivilegesQuery } from './api/use_user_permissions';
import { useKibana } from './use_kibana';

export const useIsSampleDataAvailable = () => {
  const { licensing, sampleDataIngest } = useKibana().services;

  const indexName = useMemo(() => generateRandomIndexName(), []);
  const { data: userPrivileges } = useUserPrivilegesQuery(indexName);
  const license = useObservable<ILicense | null>(licensing.license$, null);
  const hasLicense = useMemo(
    () =>
      sampleDataIngest?.minimumLicenseType
        ? license?.hasAtLeast(sampleDataIngest?.minimumLicenseType)
        : true,
    [sampleDataIngest, license]
  );
  const isPluginAvailable = !!sampleDataIngest;
  const hasPrivileges = useMemo(
    () => userPrivileges?.privileges?.canManageIndex === true,
    [userPrivileges]
  );

  return {
    isUsageAvailable: isPluginAvailable && hasPrivileges && hasLicense,
    isPluginAvailable,
    hasPrivileges,
    hasRequiredLicense: hasLicense,
  };
};
