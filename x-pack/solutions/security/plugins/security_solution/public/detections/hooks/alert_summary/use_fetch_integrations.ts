/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import {
  installationStatuses,
  useGetPackagesQuery,
  useGetSettingsQuery,
} from '@kbn/fleet-plugin/public';
import { useKibana } from '../../../common/lib/kibana';

const AI_FOR_SOC_INTEGRATIONS = [
  'splunk', // doesnt yet exist
  'google_secops',
  'microsoft_sentinel',
  'sentinel_one',
  'crowdstrike',
];

export interface UseFetchIntegrationsResult {
  /**
   *
   */
  isLoading: boolean;
  /**
   *
   */
  installedPackages: PackageListItem[];
  /**
   *
   */
  availableInstalledPackage: PackageListItem[];
}

/**
 *
 */
export const useFetchIntegrations = (): UseFetchIntegrationsResult => {
  const { fleet } = useKibana().services;
  const isAuthorizedToFetchSettings = fleet?.authz.fleet.readSettings;
  const { isFetchedAfterMount: isSettingsFetched } = useGetSettingsQuery({
    enabled: isAuthorizedToFetchSettings,
  });
  const shouldFetchPackages = !isAuthorizedToFetchSettings || isSettingsFetched;
  const { data: allPackages, isLoading } = useGetPackagesQuery(
    {
      prerelease: true,
    },
    {
      enabled: shouldFetchPackages,
    }
  );
  const aiForSOCPackages: PackageListItem[] = useMemo(
    () => (allPackages?.items || []).filter((pkg) => AI_FOR_SOC_INTEGRATIONS.includes(pkg.name)),
    [allPackages]
  );
  const availableInstalledPackage: PackageListItem[] = useMemo(
    () => aiForSOCPackages.filter((pkg) => pkg.status === installationStatuses.NotInstalled),
    [aiForSOCPackages]
  );
  const installedPackages: PackageListItem[] = useMemo(
    () =>
      aiForSOCPackages.filter(
        (pkg) =>
          pkg.status === installationStatuses.Installed ||
          pkg.status === installationStatuses.InstallFailed
      ),
    [aiForSOCPackages]
  );

  return useMemo(
    () => ({
      isLoading,
      installedPackages,
      availableInstalledPackage,
    }),
    [isLoading, installedPackages, availableInstalledPackage]
  );
};
