/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';
import type { GetInfoResponse } from '@kbn/fleet-plugin/common';
import type { GetInstalledPackagesResponse } from '@kbn/fleet-plugin/common/types';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { getInstalledPackages } from '../../../../onboarding/components/onboarding_body/cards/common/integrations/integrations_check_complete_helpers';

const isGetInfoResponse = (
  integration: GetInfoResponse | undefined
): integration is GetInfoResponse => integration !== undefined;

const buildPackageNamesQuery = (packageNames: string[]): string =>
  packageNames.length === 1
    ? packageNames[0]
    : packageNames.map((name) => `(${name})`).join(' OR ');

const useActiveEntityAnalyticsIntegrations = (packageNames: string[]) => {
  const services = useKibana().services;

  return useQuery<GetInstalledPackagesResponse>(
    ['entity-analytics-active-integrations', packageNames],
    async () => {
      return getInstalledPackages(
        {
          showOnlyActiveDataStreams: true,
          nameQuery: buildPackageNamesQuery(packageNames),
        },
        services
      );
    }
  );
};

const OKTA_PACKAGE_NAME = 'entityanalytics_okta';
const AD_PACKAGE_NAME = 'entityanalytics_ad';

export const useEntityAnalyticsIntegrations = () => {
  const { data: okta } = useGetPackageInfoByKeyQuery(
    OKTA_PACKAGE_NAME,
    undefined, // When package version is undefined it gets the latest version
    undefined, // No options required
    {
      suspense: true, // Make query suspend, it needs tu be wrapped by <Suspense />
    }
  );
  const { data: ad } = useGetPackageInfoByKeyQuery(
    AD_PACKAGE_NAME,
    undefined, // When package version is undefined it gets the latest version
    {
      prerelease: true, // This is a technical preview package, delete this line when it is GA:  https://github.com/elastic/security-team/issues/15167
    },
    {
      suspense: true,
    }
  );

  // We need to query the active integrations to check if the data streams are installed.
  // Unfortunately GetPackageInfo doesn't support 'showOnlyActiveDataStreams'
  const { data: activeIntegrationsResponse } = useActiveEntityAnalyticsIntegrations([
    OKTA_PACKAGE_NAME,
    AD_PACKAGE_NAME,
  ]);

  return [okta, ad].filter<GetInfoResponse>(isGetInfoResponse).map(({ item: packageInfo }) => {
    const activeIntegration = activeIntegrationsResponse?.items.find(
      (activePkg) => activePkg.name === packageInfo.name
    );

    return {
      packageInfo,
      hasDataStreams: activeIntegration ? activeIntegration.dataStreams.length > 0 : false,
    };
  });
};

export const usePrivilegedAccessDetectionIntegration = () => {
  const { data: pad } = useGetPackageInfoByKeyQuery(
    'pad',
    undefined, // When package version is undefined it gets the latest version
    {
      prerelease: true, // This is a technical preview package, delete this line when it is GA:  https://github.com/elastic/security-team/issues/15167
    },
    {
      suspense: false,
    }
  );

  return isGetInfoResponse(pad) ? pad.item : undefined;
};
