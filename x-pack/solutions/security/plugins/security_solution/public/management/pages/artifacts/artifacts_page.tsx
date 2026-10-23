/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppHeaderBack, AppHeaderTab } from '@kbn/app-header';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { DocLinks } from '@kbn/doc-links';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { AdministrationListPage } from '../../components/administration_list_page';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useAppUrl, useHttp, useKibana } from '../../../common/lib/kibana';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { NoPrivilegesPage } from '../../../common/components/no_privileges';
import { useHostIsolationExceptionsAccess } from '../../hooks/artifacts/use_host_isolation_exceptions_access';
import { HostIsolationExceptionsApiClient } from '../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { AdministrationSubTab } from '../../types';
import { useMemoizedRouteState } from '../../common/hooks';
import type { ListPageRouteState } from '../../../../common/endpoint/types';
import {
  getEndpointExceptionsListPath,
  getTrustedAppsListPath,
  getTrustedDevicesListPath,
  getEventFiltersListPath,
  getHostIsolationExceptionsListPath,
  getBlocklistsListPath,
  getCustomYaraSignaturesListPath,
} from '../../common/routing';
import { EndpointExceptions } from '../endpoint_exceptions/view/endpoint_exceptions';
import { TrustedAppsList } from '../trusted_apps/view/trusted_apps_list';
import { TrustedDevicesList } from '../trusted_devices/view/trusted_devices_list';
import { EventFiltersList } from '../event_filters/view/event_filters_list';
import { HostIsolationExceptionsList } from '../host_isolation_exceptions/view/host_isolation_exceptions_list';
import { Blocklist } from '../blocklist/view/blocklist';
import { CustomYaraSignaturesList } from '../custom_yara_signatures/view/custom_yara_signatures_list';
import {
  ENDPOINT_EXCEPTIONS_TAB,
  TRUSTED_APPS_TAB,
  TRUSTED_DEVICES_TAB,
  EVENT_FILTERS_TAB,
  HOST_ISOLATION_EXCEPTIONS_TAB,
  BLOCKLIST_TAB,
  CUSTOM_YARA_SIGNATURES_TAB,
} from '../../common/translations';

const ARTIFACTS_PAGE_TITLE = i18n.translate('xpack.securitySolution.artifacts.pageTitle', {
  defaultMessage: 'Artifacts',
});

const TAB_PAGE_NAMES: Partial<Record<AdministrationSubTab, SecurityPageName>> = {
  [AdministrationSubTab.endpointExceptions]: SecurityPageName.endpointExceptions,
  [AdministrationSubTab.trustedApps]: SecurityPageName.trustedApps,
  [AdministrationSubTab.trustedDevices]: SecurityPageName.trustedDevices,
  [AdministrationSubTab.eventFilters]: SecurityPageName.eventFilters,
  [AdministrationSubTab.hostIsolationExceptions]: SecurityPageName.hostIsolationExceptions,
  [AdministrationSubTab.blocklist]: SecurityPageName.blocklist,
  [AdministrationSubTab.customYaraSignatures]: SecurityPageName.customYaraSignatures,
};

const ARTIFACT_SUB_TABS: AdministrationSubTab[] = [
  AdministrationSubTab.endpointExceptions,
  AdministrationSubTab.trustedApps,
  AdministrationSubTab.trustedDevices,
  AdministrationSubTab.eventFilters,
  AdministrationSubTab.hostIsolationExceptions,
  AdministrationSubTab.blocklist,
  AdministrationSubTab.customYaraSignatures,
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
    case AdministrationSubTab.customYaraSignatures:
      return CUSTOM_YARA_SIGNATURES_TAB;
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
    case AdministrationSubTab.customYaraSignatures:
      return getCustomYaraSignaturesListPath();
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

/**
 * Doc page per active tab. Custom YARA signatures has no dedicated doc page yet, so it falls
 * back to the general endpoint artifacts/optimization doc.
 */
function getDocLinkForTab(
  tab: AdministrationSubTab,
  securitySolutionDocLinks: DocLinks['securitySolution']
): string {
  switch (tab) {
    case AdministrationSubTab.endpointExceptions:
      return securitySolutionDocLinks.endpointExceptions;
    case AdministrationSubTab.trustedApps:
      return securitySolutionDocLinks.trustedApps;
    case AdministrationSubTab.trustedDevices:
      return securitySolutionDocLinks.trustedDevices;
    case AdministrationSubTab.eventFilters:
      return securitySolutionDocLinks.eventFilters;
    case AdministrationSubTab.hostIsolationExceptions:
      return securitySolutionDocLinks.hostIsolationExceptions;
    case AdministrationSubTab.blocklist:
      return securitySolutionDocLinks.blocklist;
    case AdministrationSubTab.customYaraSignatures:
    default:
      return securitySolutionDocLinks.endpointArtifacts;
  }
}

export const ArtifactsPage = memo(() => {
  const location = useLocation<ListPageRouteState | undefined>();
  const http = useHttp();
  const { getAppUrl } = useAppUrl();
  const {
    services: { docLinks },
  } = useKibana();
  const endpointExceptionsMovedUnderManagement = useIsExperimentalFeatureEnabled(
    'endpointExceptionsMovedUnderManagement'
  );
  const trustedDevicesEnabled = useIsExperimentalFeatureEnabled('trustedDevices');
  const customYaraSignaturesEnabled = useIsExperimentalFeatureEnabled(
    'customYaraSignaturesEnabled'
  );
  const {
    canReadBlocklist,
    canReadTrustedApplications,
    canReadTrustedDevices,
    canReadEventFilters,
    canReadHostIsolationExceptions,
    canAccessHostIsolationExceptions,
    canReadEndpointExceptions,
    canReadCustomYaraSignatures,
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
      if (tab === AdministrationSubTab.customYaraSignatures) {
        return customYaraSignaturesEnabled && canReadCustomYaraSignatures;
      }
      return true;
    });
  }, [
    endpointExceptionsMovedUnderManagement,
    trustedDevicesEnabled,
    customYaraSignaturesEnabled,
    canReadEndpointExceptions,
    canReadTrustedApplications,
    canReadTrustedDevices,
    canReadEventFilters,
    canReadHostIsolationExceptions,
    isHostIsolationExceptionsAccessLoading,
    hasAccessToHostIsolationExceptions,
    canReadBlocklist,
    canReadCustomYaraSignatures,
  ]);

  const activeTab = useMemo(
    () => getActiveTabFromPathname(location.pathname, visibleTabs),
    [location.pathname, visibleTabs]
  );

  const headerTabs: AppHeaderTab[] = useMemo(
    () =>
      visibleTabs.map((tab) => ({
        id: tab,
        label: getTabLabel(tab),
        isSelected: tab === activeTab,
        href: getAppUrl({ path: getPathForTab(tab, visibleTabs) }),
      })),
    [visibleTabs, activeTab, getAppUrl]
  );

  const docLink = useMemo(
    () => getDocLinkForTab(activeTab, docLinks.links.securitySolution),
    [activeTab, docLinks.links.securitySolution]
  );

  // When this page is opened from a policy's artifact empty-state "Manage" action, the route
  // state carries a back target to that policy. `useMemoizedRouteState` keeps it around across
  // tab switches, which drop `location.state` (same-origin hrefs navigate like plain links).
  const memoizedRouteState = useMemoizedRouteState(location.state);
  const backNavigateTo = memoizedRouteState?.onBackButtonNavigateTo;
  const backOnClick = useNavigateToAppEventHandler(backNavigateTo?.[0] ?? '', {
    path: backNavigateTo?.[1]?.path,
    state: backNavigateTo?.[1]?.state,
  });
  const back: AppHeaderBack | undefined = useMemo(() => {
    if (!memoizedRouteState?.onBackButtonNavigateTo || !memoizedRouteState.backButtonUrl) {
      return undefined;
    }
    return {
      href: memoizedRouteState.backButtonUrl,
      label:
        memoizedRouteState.backButtonLabel ??
        i18n.translate('xpack.securitySolution.artifacts.backButtonDefaultLabel', {
          defaultMessage: 'policy',
        }),
      onClick: backOnClick,
    };
  }, [memoizedRouteState, backOnClick]);

  return (
    <AdministrationListPage
      data-test-subj="artifactsPage"
      title={ARTIFACTS_PAGE_TITLE}
      tabs={headerTabs}
      back={back}
      docLink={docLink}
    >
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
        {activeTab === AdministrationSubTab.customYaraSignatures && <CustomYaraSignaturesList />}
        <SpyRoute pageName={SecurityPageName.artifacts} />
      </TrackApplicationView>
    </AdministrationListPage>
  );
});

ArtifactsPage.displayName = 'ArtifactsPage';
