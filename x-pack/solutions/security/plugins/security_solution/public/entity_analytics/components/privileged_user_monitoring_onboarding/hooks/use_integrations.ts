/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';
import type { GetInfoResponse } from '@kbn/fleet-plugin/common';

export const useEntityAnalyticsIntegrations = () => {
  const { data: okta, isLoading: isLoadingOkta } =
    useGetPackageInfoByKeyQuery('entityanalytics_okta');
  const { data: entra, isLoading: isLoadingEntra } = useGetPackageInfoByKeyQuery(
    'entityanalytics_entra_id'
  );
  const { data: ad, isLoading: isLoadingAd } = useGetPackageInfoByKeyQuery(
    'entityanalytics_ad',
    undefined, // When package version is undefined it gets the latest version
    {
      prerelease: true, // This is a technical preview package, delete this line when it is GA
    }
  );

  const integrations = [okta, ad, entra]
    .filter<GetInfoResponse>(
      (integration): integration is GetInfoResponse => integration !== undefined
    )
    .map(({ item }) => item);

  return { integrations, isLoading: isLoadingOkta || isLoadingAd || isLoadingEntra };
};
