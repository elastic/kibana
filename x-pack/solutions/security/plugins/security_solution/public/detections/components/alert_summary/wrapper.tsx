/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  installationStatuses,
  useGetPackagesQuery,
  useGetSettingsQuery,
} from '@kbn/fleet-plugin/public';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import {
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiSkeletonLoading,
  EuiSkeletonRectangle,
  EuiSpacer,
} from '@elastic/eui';
import { DATAVIEW_ERROR } from '../../pages/alert_summary/translations';
import { IntegrationSection } from './integrations/integration_section';
import { SearchBarSection } from './search_bar/search_bar_section';
import { KPIsSection } from './kpis/kpis_section';
import { TableSection } from './table/table_section';
import { useKibana } from '../../../common/lib/kibana';

export interface WrapperProps {
  /**
   *
   */
  dataView: DataView;
  /**
   * TEMP: for demo purposes ONLY, toggles between old and unified components
   */
  showUnifiedComponents: boolean;
}

/**
 *
 */
export const Wrapper = memo(({ dataView, showUnifiedComponents }: WrapperProps) => {
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

  if (!isLoading && installedPackages.length === 0) {
    return <EuiEmptyPrompt iconType="error" color="danger" title={<h2>{DATAVIEW_ERROR}</h2>} />;
  }

  return (
    <EuiSkeletonLoading
      isLoading={isLoading}
      loadingContent={
        <>
          <EuiSkeletonRectangle height={50} width="100%" />
          <EuiHorizontalRule />
          <EuiSkeletonRectangle height={50} width="100%" />
          <EuiSpacer />
          <EuiSkeletonRectangle height={275} width="100%" />
          <EuiSpacer />
          <EuiSkeletonRectangle height={600} width="100%" />
        </>
      }
      loadedContent={
        <>
          <IntegrationSection installedPackages={installedPackages} />
          <EuiHorizontalRule />
          <SearchBarSection
            dataView={dataView}
            installedPackages={installedPackages}
            showUnifiedComponents={showUnifiedComponents}
          />
          <EuiSpacer />
          <KPIsSection dataView={dataView} />
          <EuiSpacer />
          <TableSection dataView={dataView} showUnifiedComponents={showUnifiedComponents} />
        </>
      }
    />
  );
});

Wrapper.displayName = 'Wrapper';
