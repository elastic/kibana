/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useUserPrivileges } from '../../../common/components/user_privileges';
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
} from '../../common/translations';

const HOST_ISOLATION_EXCEPTIONS_TAB = i18n.translate(
  'xpack.securitySolution.artifacts.tabs.hostIsolationExceptions',
  { defaultMessage: 'Host isolation exceptions' }
);

const BLOCKLIST_TAB = i18n.translate('xpack.securitySolution.artifacts.tabs.blocklist', {
  defaultMessage: 'Blocklist',
});

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

function getPathForTab(tab: AdministrationSubTab): string {
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
      return getTrustedAppsListPath();
  }
}

function getSecurityPageNameForTab(tab: AdministrationSubTab): SecurityPageName {
  switch (tab) {
    case AdministrationSubTab.endpointExceptions:
      return SecurityPageName.endpointExceptions;
    case AdministrationSubTab.trustedApps:
      return SecurityPageName.trustedApps;
    case AdministrationSubTab.trustedDevices:
      return SecurityPageName.trustedDevices;
    case AdministrationSubTab.eventFilters:
      return SecurityPageName.eventFilters;
    case AdministrationSubTab.hostIsolationExceptions:
      return SecurityPageName.hostIsolationExceptions;
    case AdministrationSubTab.blocklist:
      return SecurityPageName.blocklist;
    default:
      return SecurityPageName.trustedApps;
  }
}

function getActiveTabFromPathname(pathname: string): AdministrationSubTab {
  for (const tab of ARTIFACT_SUB_TABS) {
    if (pathname.includes(`/${tab}`)) {
      return tab;
    }
  }
  return AdministrationSubTab.trustedApps;
}

export const ArtifactsPage = memo(() => {
  const location = useLocation();
  const history = useHistory();
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
    canReadEndpointExceptions,
  } = useUserPrivileges().endpointPrivileges;

  const activeTab = useMemo(
    () => getActiveTabFromPathname(location.pathname),
    [location.pathname]
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
        return canReadHostIsolationExceptions;
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
    canReadBlocklist,
  ]);

  const selectedTabIndex = visibleTabs.findIndex((tab) => tab === activeTab);
  const effectiveSelectedIndex =
    visibleTabs.length > 0 && selectedTabIndex >= 0 ? selectedTabIndex : 0;

  const onTabClick = (tab: AdministrationSubTab) => {
    history.push(getPathForTab(tab));
  };

  const pageName = getSecurityPageNameForTab(activeTab);

  return (
    <TrackApplicationView viewId={pageName}>
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
      {activeTab === AdministrationSubTab.endpointExceptions && <EndpointExceptions />}
      {activeTab === AdministrationSubTab.trustedApps && <TrustedAppsList />}
      {activeTab === AdministrationSubTab.trustedDevices && <TrustedDevicesList />}
      {activeTab === AdministrationSubTab.eventFilters && <EventFiltersList />}
      {activeTab === AdministrationSubTab.hostIsolationExceptions && (
        <HostIsolationExceptionsList />
      )}
      {activeTab === AdministrationSubTab.blocklist && <Blocklist />}
      <SpyRoute pageName={pageName} />
    </TrackApplicationView>
  );
});

ArtifactsPage.displayName = 'ArtifactsPage';
