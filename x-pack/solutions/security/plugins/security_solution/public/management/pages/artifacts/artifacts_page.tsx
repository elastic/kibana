/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import {
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { AdministrationListPage } from '../../components/administration_list_page';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useHttp } from '../../../common/lib/kibana';
import { NoPrivilegesPage } from '../../../common/components/no_privileges';
import { useHostIsolationExceptionsAccess } from '../../hooks/artifacts/use_host_isolation_exceptions_access';
import { HostIsolationExceptionsApiClient } from '../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { AdministrationSubTab } from '../../types';
import {
  getEndpointExceptionsListPath,
  getTrustedAppsListPath,
  getTrustedDevicesListPath,
  getEventFiltersListPath,
  getHostIsolationExceptionsListPath,
  getBlocklistsListPath,
} from '../../common/routing';
import { EndpointExceptions } from '../endpoint_exceptions/view/endpoint_exceptions';
import { TrustedAppsList } from '../trusted_apps/view/trusted_apps_list';
import { TrustedDevicesList } from '../trusted_devices/view/trusted_devices_list';
import { EventFiltersList } from '../event_filters/view/event_filters_list';
import { HostIsolationExceptionsList } from '../host_isolation_exceptions/view/host_isolation_exceptions_list';
import { Blocklist } from '../blocklist/view/blocklist';
import {
  ENDPOINT_EXCEPTIONS_TAB,
  TRUSTED_APPS_TAB,
  TRUSTED_DEVICES_TAB,
  EVENT_FILTERS_TAB,
  HOST_ISOLATION_EXCEPTIONS_TAB,
  BLOCKLIST_TAB,
} from '../../common/translations';

const ARTIFACTS_PAGE_TITLE = i18n.translate('xpack.securitySolution.artifacts.pageTitle', {
  defaultMessage: 'Artifacts',
});

const ARTIFACTS_PAGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.artifacts.pageDescription',
  {
    defaultMessage:
      'Manage exceptions, trusted applications, and other settings that control how endpoints are protected and respond to activity.',
  }
);

const TAB_PAGE_NAMES: Partial<Record<AdministrationSubTab, SecurityPageName>> = {
  [AdministrationSubTab.endpointExceptions]: SecurityPageName.endpointExceptions,
  [AdministrationSubTab.trustedApps]: SecurityPageName.trustedApps,
  [AdministrationSubTab.trustedDevices]: SecurityPageName.trustedDevices,
  [AdministrationSubTab.eventFilters]: SecurityPageName.eventFilters,
  [AdministrationSubTab.hostIsolationExceptions]: SecurityPageName.hostIsolationExceptions,
  [AdministrationSubTab.blocklist]: SecurityPageName.blocklist,
};

const ARTIFACT_SUB_TABS: AdministrationSubTab[] = [
  AdministrationSubTab.endpointExceptions,
  AdministrationSubTab.trustedApps,
  AdministrationSubTab.trustedDevices,
  AdministrationSubTab.eventFilters,
  AdministrationSubTab.hostIsolationExceptions,
  AdministrationSubTab.blocklist,
];

function getTabLabel(tab: AdministrationSubTab): string {
  switch (tab) {
    case AdministrationSubTab.endpointExceptions:
      return ENDPOINT_EXCEPTIONS_TAB;
    case AdministrationSubTab.trustedApps:
      return TRUSTED_APPS_TAB;
    case AdministrationSubTab.trustedDevices:
      return TRUSTED_DEVICES_TAB;
    case AdministrationSubTab.eventFilters:
      return EVENT_FILTERS_TAB;
    case AdministrationSubTab.hostIsolationExceptions:
      return HOST_ISOLATION_EXCEPTIONS_TAB;
    case AdministrationSubTab.blocklist:
      return BLOCKLIST_TAB;
    default:
      return tab;
  }
}

function getPathForTab(
  tab: AdministrationSubTab,
  visibleTabs: AdministrationSubTab[] = []
): string {
  switch (tab) {
    case AdministrationSubTab.endpointExceptions:
      return getEndpointExceptionsListPath();
    case AdministrationSubTab.trustedApps:
      return getTrustedAppsListPath();
    case AdministrationSubTab.trustedDevices:
      return getTrustedDevicesListPath();
    case AdministrationSubTab.eventFilters:
      return getEventFiltersListPath();
    case AdministrationSubTab.hostIsolationExceptions:
      return getHostIsolationExceptionsListPath();
    case AdministrationSubTab.blocklist:
      return getBlocklistsListPath();
    default:
      // visibleTabs[0] covers all reachable cases; the getTrustedAppsListPath fallback
      // is unreachable because canReadAnyArtifact would be false and the link excluded
      return visibleTabs.length > 0 ? getPathForTab(visibleTabs[0]) : getTrustedAppsListPath();
  }
}

function getActiveTabFromPathname(
  pathname: string,
  visibleTabs: AdministrationSubTab[]
): AdministrationSubTab {
  for (const tab of ARTIFACT_SUB_TABS) {
    if (pathname.includes(`/${tab}`)) {
      return tab;
    }
  }
  return visibleTabs[0] ?? AdministrationSubTab.trustedApps;
}

export const ArtifactsPage = memo(() => {
  const location = useLocation();
  const history = useHistory();
  const http = useHttp();
  const endpointExceptionsMovedUnderManagement = useIsExperimentalFeatureEnabled(
    'endpointExceptionsMovedUnderManagement'
  );
  const trustedDevicesEnabled = useIsExperimentalFeatureEnabled('trustedDevices');
  const {
    canReadBlocklist,
    canReadTrustedApplications,
    canReadTrustedDevices,
    canReadEventFilters,
    canReadHostIsolationExceptions,
    canAccessHostIsolationExceptions,
    canReadEndpointExceptions,
  } = useUserPrivileges().endpointPrivileges;

  const getHostIsolationExceptionsApiClientInstance = useCallback(
    () => HostIsolationExceptionsApiClient.getInstance(http),
    [http]
  );

  const { hasAccessToHostIsolationExceptions, isHostIsolationExceptionsAccessLoading } =
    useHostIsolationExceptionsAccess(
      canAccessHostIsolationExceptions,
      canReadHostIsolationExceptions,
      getHostIsolationExceptionsApiClientInstance
    );

  const visibleTabs = useMemo(() => {
    return ARTIFACT_SUB_TABS.filter((tab) => {
      if (tab === AdministrationSubTab.endpointExceptions) {
        return endpointExceptionsMovedUnderManagement && canReadEndpointExceptions;
      }
      if (tab === AdministrationSubTab.trustedApps) {
        return canReadTrustedApplications;
      }
      if (tab === AdministrationSubTab.trustedDevices) {
        return trustedDevicesEnabled && canReadTrustedDevices;
      }
      if (tab === AdministrationSubTab.eventFilters) {
        return canReadEventFilters;
      }
      if (tab === AdministrationSubTab.hostIsolationExceptions) {
        return (
          canReadHostIsolationExceptions &&
          (isHostIsolationExceptionsAccessLoading || hasAccessToHostIsolationExceptions)
        );
      }
      if (tab === AdministrationSubTab.blocklist) {
        return canReadBlocklist;
      }
      return true;
    });
  }, [
    endpointExceptionsMovedUnderManagement,
    trustedDevicesEnabled,
    canReadEndpointExceptions,
    canReadTrustedApplications,
    canReadTrustedDevices,
    canReadEventFilters,
    canReadHostIsolationExceptions,
    isHostIsolationExceptionsAccessLoading,
    hasAccessToHostIsolationExceptions,
    canReadBlocklist,
  ]);

  const activeTab = useMemo(
    () => getActiveTabFromPathname(location.pathname, visibleTabs),
    [location.pathname, visibleTabs]
  );

  const selectedTabIndex = visibleTabs.findIndex((tab) => tab === activeTab);
  const effectiveSelectedIndex =
    visibleTabs.length > 0 && selectedTabIndex >= 0 ? selectedTabIndex : 0;

  const onTabClick = useCallback(
    (tab: AdministrationSubTab) => {
      history.push(getPathForTab(tab, visibleTabs));
    },
    [history, visibleTabs]
  );

  return (
    <AdministrationListPage
      data-test-subj="artifactsPage"
      title={ARTIFACTS_PAGE_TITLE}
      subtitle={ARTIFACTS_PAGE_DESCRIPTION}
      hasBottomBorder={false}
    >
      <EuiTabs>
        {visibleTabs.map((tab, index) => (
          <EuiTab
            key={tab}
            isSelected={index === effectiveSelectedIndex}
            onClick={() => onTabClick(tab)}
          >
            {getTabLabel(tab)}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="l" />
      <TrackApplicationView viewId={TAB_PAGE_NAMES[activeTab] ?? SecurityPageName.artifacts}>
        {activeTab === AdministrationSubTab.endpointExceptions && <EndpointExceptions />}
        {activeTab === AdministrationSubTab.trustedApps && <TrustedAppsList />}
        {activeTab === AdministrationSubTab.trustedDevices && <TrustedDevicesList />}
        {activeTab === AdministrationSubTab.eventFilters && <EventFiltersList />}
        {activeTab === AdministrationSubTab.hostIsolationExceptions &&
          isHostIsolationExceptionsAccessLoading && (
            <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" data-test-subj="artifactsPage-hieAccessLoading" />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        {activeTab === AdministrationSubTab.hostIsolationExceptions &&
          !isHostIsolationExceptionsAccessLoading &&
          !hasAccessToHostIsolationExceptions && (
            <NoPrivilegesPage
              docLinkSelector={({ securitySolution }) => securitySolution.privileges}
            />
          )}
        {activeTab === AdministrationSubTab.hostIsolationExceptions &&
          !isHostIsolationExceptionsAccessLoading &&
          hasAccessToHostIsolationExceptions && <HostIsolationExceptionsList />}
        {activeTab === AdministrationSubTab.blocklist && <Blocklist />}
        <SpyRoute pageName={SecurityPageName.artifacts} />
      </TrackApplicationView>
    </AdministrationListPage>
  );
});

ArtifactsPage.displayName = 'ArtifactsPage';
