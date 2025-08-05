/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';
import type { GetInfoResponse } from '@kbn/fleet-plugin/common';

const isGetInfoResponse = (
  integration: GetInfoResponse | undefined
): integration is GetInfoResponse => integration !== undefined;

export const useEntityAnalyticsIntegrations = () => {
  const { data: okta } = useGetPackageInfoByKeyQuery(
    'entityanalytics_okta',
    undefined, // When package version is undefined it gets the latest version
    undefined, // No options required
    {
      suspense: true, // Make query suspend, it needs tu be wrapped by <Suspense />
    }
  );
  const { data: ad } = useGetPackageInfoByKeyQuery(
    'entityanalytics_ad',
    undefined, // When package version is undefined it gets the latest version
    {
      prerelease: true, // This is a technical preview package, delete this line when it is GA
    },
    {
      suspense: true,
    }
  );

  return [okta, ad].filter<GetInfoResponse>(isGetInfoResponse).map(({ item }) => item);
};

export const usePrivilegedAccessDetectionIntegration = () => {
  const { data: pad } = useGetPackageInfoByKeyQuery(
    'pad',
    undefined, // When package version is undefined it gets the latest version
    {
      prerelease: true, // This is a technical preview package, delete this line when it is GA
    },
    {
      suspense: false,
    }
  );

  return isGetInfoResponse(pad) ? pad.item : undefined;
};
