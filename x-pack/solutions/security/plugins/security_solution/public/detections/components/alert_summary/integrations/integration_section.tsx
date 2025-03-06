/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  installationStatuses,
  useGetPackagesQuery,
  useGetSettingsQuery,
} from '@kbn/fleet-plugin/public';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';
import { AddIntegration } from './add_integration';
import { IntegrationBadge } from './integration_badge';

/**
 *
 */
export const IntegrationSection = memo(() => {
  const { fleet } = useKibana().services;
  const isAuthorizedToFetchSettings = fleet?.authz.fleet.readSettings;
  const { data: settings, isFetchedAfterMount: isSettingsFetched } = useGetSettingsQuery({
    enabled: isAuthorizedToFetchSettings,
  });
  const prereleaseIntegrationsEnabled = settings?.item.prerelease_integrations_enabled ?? false;
  const shouldFetchPackages = !isAuthorizedToFetchSettings || isSettingsFetched;
  const { data: allPackages, isLoading } = useGetPackagesQuery(
    {
      prerelease: prereleaseIntegrationsEnabled,
    },
    {
      enabled: shouldFetchPackages,
    }
  );
  const installedPackages: PackageListItem[] = useMemo(
    () =>
      (allPackages?.items || []).filter(
        (pkg) =>
          pkg.status === installationStatuses.Installed ||
          pkg.status === installationStatuses.InstallFailed
      ),
    [allPackages]
  );

  return (
    <>
      {isLoading ? (
        <>
          <div>{'hello'}</div>
        </>
      ) : (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {installedPackages.map((installedPackage) => (
            <EuiFlexItem grow={false}>
              <IntegrationBadge integration={installedPackage} />
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <AddIntegration />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
});

IntegrationSection.displayName = 'IntegrationSection';
