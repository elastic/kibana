/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiButton,
  EuiText,
  EuiTabs,
  EuiTab,
  EuiButtonEmpty,
} from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useKibana } from '../../common/lib/kibana';
import { ENTITY_ANALYTICS_ENDPOINT_ASSETS_PATH } from '../../../common/constants';
import { PlatformIcon } from '../../management/components/endpoint_responder/components/header_info/platforms';
import { OverviewTab } from './host_details/tabs/overview_tab';
import { DriftTab } from './host_details/tabs/drift_tab';
import { PostureTab } from './host_details/tabs/posture_tab';
import { PrivilegesTab } from './host_details/tabs/privileges_tab';
import { SoftwareTab } from './host_details/tabs/software_tab';
import { useInvestigateInTimeline } from '../../common/hooks/timeline/use_investigate_in_timeline';
import { normalizeTimeRange } from '../../common/utils/normalize_time_range';
import { OsqueryFlyout } from '../../detections/components/osquery/osquery_flyout';

const ENTITY_STORE_HOST_INDEX = '.entities.v1.latest.security_host_*';
const HOST_DETAILS_QUERY_KEY = 'host-details';

const HOST_DETAILS_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.pageTitle',
  {
    defaultMessage: 'Host Details',
  }
);

const HOST_NOT_FOUND_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.notFoundTitle',
  {
    defaultMessage: 'Host not found',
  }
);

const HOST_NOT_FOUND_BODY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.notFoundBody',
  {
    defaultMessage: 'The requested host could not be found or you do not have access to it.',
  }
);

const BACK_TO_ASSETS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.backToAssets',
  {
    defaultMessage: 'Back to Endpoint Assets',
  }
);

const LOADING_HOST_DATA = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.loadingHostData',
  {
    defaultMessage: 'Loading host data...',
  }
);

const TAB_OVERVIEW = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.tabOverview',
  {
    defaultMessage: 'Overview',
  }
);

const TAB_DRIFT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.tabDrift',
  {
    defaultMessage: 'Drift',
  }
);

const TAB_POSTURE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.tabPosture',
  {
    defaultMessage: 'Security Posture',
  }
);

const TAB_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.tabPrivileges',
  {
    defaultMessage: 'Privileges',
  }
);

const TAB_SOFTWARE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.tabSoftware',
  {
    defaultMessage: 'Software',
  }
);

const INVESTIGATE_IN_TIMELINE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.investigateInTimeline',
  {
    defaultMessage: 'Investigate in Timeline',
  }
);

const RUN_OSQUERY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.runOsquery',
  {
    defaultMessage: 'Run Osquery',
  }
);

interface HostDetailsPageParams {
  hostId: string;
}

interface HostDetailsData {
  '@timestamp': string;
  entity: {
    id: string;
    name: string;
    source: string;
  };
  host?: {
    id?: string;
    name?: string;
    hostname?: string;
    ip?: string | string[];
    mac?: string | string[];
    os?: {
      name?: string;
      platform?: string;
      version?: string;
      type?: string;
      family?: string;
      build?: string;
      kernel?: string;
    };
    architecture?: string;
  };
  agent?: {
    id?: string;
    name?: string;
    version?: string;
  };
  // Entity Store stores hardware under endpoint.* namespace
  // Fields are flattened (not nested) to match transform output
  endpoint?: {
    hardware?: {
      vendor?: string;
      model?: string;
      serial?: string;
      uuid?: string;
      // Flattened CPU fields
      cpu?: string; // CPU brand string
      cpu_cores?: string | number; // logical cores
      cpu_physical_cores?: string | number;
      cpu_type?: string;
      cpu_sockets?: string | number;
      // Flattened memory fields
      memory_gb?: string | number;
      memory_type?: string;
      memory_speed?: string;
      // Flattened disk fields
      disk_count?: string | number;
      disk_total_gb?: string | number;
      // Flattened USB fields
      usb_count?: string | number;
      usb_removable_count?: string | number;
      // Flattened board fields
      board_vendor?: string;
      board_model?: string;
    };
    network?: {
      listening_ports_count?: string | number;
      interface_count?: string | number;
      mac_addresses?: string[];
      ip_addresses?: string[];
    };
    software?: {
      installed_count?: string | number;
      services_count?: string | number;
      browsers?: string[];
      security_tools?: string[];
      remote_access?: string[];
    };
    posture?: {
      score?: number;
      level?: string;
      firewall_enabled?: boolean;
      secure_boot?: boolean;
      disk_encryption?: string;
      checks?: {
        total?: number;
        passed?: number;
        failed?: number;
      };
      failed_checks?: string[];
    };
    drift?: {
      events_24h?: {
        total?: number;
        by_severity?: {
          critical?: number;
          high?: number;
          medium?: number;
          low?: number;
        };
      };
    };
    privileges?: {
      admin_count?: number;
      elevated_risk?: boolean;
      local_admins?: string[];
      root_users?: string[];
      ssh_keys_count?: number;
    };
    lifecycle?: {
      first_seen?: string;
      last_seen?: string;
    };
  };
}

const normalizePlatform = (platform?: string): 'windows' | 'macos' | 'linux' | null => {
  if (!platform) return null;
  const normalized = platform.toLowerCase();
  if (normalized.includes('windows')) return 'windows';
  if (normalized.includes('macos') || normalized.includes('darwin')) return 'macos';
  if (normalized.includes('linux')) return 'linux';
  return null;
};

const useHostDetails = (hostId: string | null) => {
  const { services } = useKibana();

  const fetchHostDetails = useCallback(async (): Promise<HostDetailsData | null> => {
    if (!hostId) return null;

    const { data } = services;
    if (!data?.search) {
      throw new Error('Search service not available');
    }

    type DetailSearchRequest = IKibanaSearchRequest<estypes.SearchRequest>;
    type DetailSearchResponse = IKibanaSearchResponse<
      estypes.SearchResponse<HostDetailsData, never>
    >;

    const searchRequest: estypes.SearchRequest = {
      index: ENTITY_STORE_HOST_INDEX,
      size: 1,
      sort: [{ '@timestamp': 'desc' }],
      query: {
        term: {
          'entity.id': hostId,
        },
      },
    };

    const response$ = data.search.search<DetailSearchRequest, DetailSearchResponse>({
      params: searchRequest,
    });

    const response = await lastValueFrom(response$);
    const hit = response.rawResponse.hits.hits[0];

    // DEBUG: Log raw response to see actual data structure
    console.log('[HostDetails] Raw ES response:', response.rawResponse);
    console.log('[HostDetails] Hit _source:', hit?._source);
    console.log('[HostDetails] Endpoint data:', hit?._source?.endpoint);
    console.log('[HostDetails] Posture data:', hit?._source?.endpoint?.posture);
    console.log('[HostDetails] Privileges data:', hit?._source?.endpoint?.privileges);
    console.log('[HostDetails] Hardware data:', hit?._source?.endpoint?.hardware);

    return hit ? hit._source : null;
  }, [hostId, services]);

  return useQuery({
    queryKey: [HOST_DETAILS_QUERY_KEY, hostId],
    queryFn: fetchHostDetails,
    enabled: !!hostId,
    staleTime: 30000,
  });
};

type TabId = 'overview' | 'drift' | 'posture' | 'privileges' | 'software';

export const HostDetailsPage: React.FC = React.memo(() => {
  const { hostId } = useParams<HostDetailsPageParams>();
  const { indexPattern, sourcererDataView } = useSourcererDataView();
  const { services } = useKibana();
  const { navigateToApp } = services.application;
  const { data: hostData, isLoading, error } = useHostDetails(hostId || null);
  const [selectedTab, setSelectedTab] = useState<TabId>('overview');
  const [isOsqueryFlyoutOpen, setIsOsqueryFlyoutOpen] = useState(false);
  const { investigateInTimeline } = useInvestigateInTimeline();
  const hasOsquery = !!services.osquery;

  const handleBackToAssets = useCallback(() => {
    navigateToApp('securitySolutionUI', {
      path: ENTITY_ANALYTICS_ENDPOINT_ASSETS_PATH,
    });
  }, [navigateToApp]);

  const handleInvestigateInTimeline = useCallback(() => {
    const last30MinRange = normalizeTimeRange({
      kind: 'absolute',
      from: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      to: new Date(Date.now()).toISOString(),
    });

    investigateInTimeline({
      timeRange: {
        from: last30MinRange.from,
        to: last30MinRange.to,
        kind: 'absolute',
      },
      keepDataView: true,
      query: {
        language: 'kuery',
        query: `host.name: "${hostData?.entity.name || hostId}"`,
      },
    });
  }, [investigateInTimeline, hostData, hostId]);

  const handleRunOsquery = useCallback(() => {
    setIsOsqueryFlyoutOpen(true);
  }, []);

  const handleCloseOsqueryFlyout = useCallback(() => {
    setIsOsqueryFlyoutOpen(false);
  }, []);

  const tabs = useMemo(
    () => [
      {
        id: 'overview' as TabId,
        label: TAB_OVERVIEW,
      },
      {
        id: 'drift' as TabId,
        label: TAB_DRIFT,
      },
      {
        id: 'posture' as TabId,
        label: TAB_POSTURE,
      },
      {
        id: 'privileges' as TabId,
        label: TAB_PRIVILEGES,
      },
      {
        id: 'software' as TabId,
        label: TAB_SOFTWARE,
      },
    ],
    []
  );

  const renderTabContent = useCallback(() => {
    if (!hostId || !hostData) return null;

    switch (selectedTab) {
      case 'overview':
        return <OverviewTab hostId={hostId} hostData={hostData} />;
      case 'drift':
        return <DriftTab hostId={hostId} />;
      case 'posture':
        return <PostureTab hostId={hostId} postureData={hostData.endpoint?.posture} />;
      case 'privileges':
        return <PrivilegesTab hostId={hostId} privilegesData={hostData.endpoint?.privileges} />;
      case 'software':
        return (
          <SoftwareTab
            hostId={hostId}
            installedCount={
              typeof hostData.endpoint?.software?.installed_count === 'number'
                ? hostData.endpoint.software.installed_count
                : typeof hostData.endpoint?.software?.installed_count === 'string'
                ? parseInt(hostData.endpoint.software.installed_count, 10)
                : undefined
            }
            servicesCount={
              typeof hostData.endpoint?.software?.services_count === 'number'
                ? hostData.endpoint.software.services_count
                : typeof hostData.endpoint?.software?.services_count === 'string'
                ? parseInt(hostData.endpoint.software.services_count, 10)
                : undefined
            }
          />
        );
      default:
        return null;
    }
  }, [selectedTab, hostId, hostData]);

  const platform = useMemo(() => {
    if (!hostData?.host?.os?.platform) return null;
    return normalizePlatform(hostData.host.os.platform);
  }, [hostData]);

  if (!hostId) {
    return (
      <SecuritySolutionPageWrapper>
        <HeaderPage title={HOST_DETAILS_PAGE_TITLE} />
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
          title={<h2>{HOST_NOT_FOUND_TITLE}</h2>}
          body={<p>{HOST_NOT_FOUND_BODY}</p>}
          actions={
            <EuiButton onClick={handleBackToAssets} fill>
              {BACK_TO_ASSETS_LABEL}
            </EuiButton>
          }
        />
        <SpyRoute pageName={SecurityPageName.entityAnalyticsEndpointAssets} />
      </SecuritySolutionPageWrapper>
    );
  }

  if (isLoading) {
    return (
      <>
        <FiltersGlobal show={false}>
          <SiemSearchBar
            id={InputsModelId.global}
            indexPattern={indexPattern}
            sourcererDataView={sourcererDataView}
          />
        </FiltersGlobal>
        <SecuritySolutionPageWrapper>
          <HeaderPage
            title={HOST_DETAILS_PAGE_TITLE}
            backOptions={{
              text: BACK_TO_ASSETS_LABEL,
              onClick: handleBackToAssets,
              dataTestSubj: 'host-details-back-button',
            }}
          />
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
              <EuiSpacer size="m" />
              <EuiText>{LOADING_HOST_DATA}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <SpyRoute pageName={SecurityPageName.entityAnalyticsEndpointAssets} />
        </SecuritySolutionPageWrapper>
      </>
    );
  }

  if (error || !hostData) {
    return (
      <>
        <FiltersGlobal show={false}>
          <SiemSearchBar
            id={InputsModelId.global}
            indexPattern={indexPattern}
            sourcererDataView={sourcererDataView}
          />
        </FiltersGlobal>
        <SecuritySolutionPageWrapper>
          <HeaderPage
            title={HOST_DETAILS_PAGE_TITLE}
            backOptions={{
              text: BACK_TO_ASSETS_LABEL,
              onClick: handleBackToAssets,
              dataTestSubj: 'host-details-back-button',
            }}
          />
          <EuiSpacer size="l" />
          <EuiEmptyPrompt
            iconType="alert"
            color="danger"
            title={<h2>{HOST_NOT_FOUND_TITLE}</h2>}
            body={<p>{HOST_NOT_FOUND_BODY}</p>}
            actions={
              <EuiButton onClick={handleBackToAssets} fill>
                {BACK_TO_ASSETS_LABEL}
              </EuiButton>
            }
          />
          <SpyRoute pageName={SecurityPageName.entityAnalyticsEndpointAssets} />
        </SecuritySolutionPageWrapper>
      </>
    );
  }

  return (
    <>
      <FiltersGlobal show={false}>
        <SiemSearchBar
          id={InputsModelId.global}
          indexPattern={indexPattern}
          sourcererDataView={sourcererDataView}
        />
      </FiltersGlobal>

      <SecuritySolutionPageWrapper>
        <HeaderPage
          title={HOST_DETAILS_PAGE_TITLE}
          subtitle={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {platform && (
                <EuiFlexItem grow={false}>
                  <PlatformIcon platform={platform} />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="s">{hostData.entity.name}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          backOptions={{
            text: BACK_TO_ASSETS_LABEL,
            onClick: handleBackToAssets,
            dataTestSubj: 'host-details-back-button',
          }}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="timeline"
                onClick={handleInvestigateInTimeline}
                data-test-subj="host-details-investigate-in-timeline"
              >
                {INVESTIGATE_IN_TIMELINE}
              </EuiButton>
            </EuiFlexItem>
            {hasOsquery && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="console"
                  onClick={handleRunOsquery}
                  data-test-subj="host-details-run-osquery"
                >
                  {RUN_OSQUERY}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </HeaderPage>

        <EuiSpacer size="l" />

        <EuiTabs>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              isSelected={selectedTab === tab.id}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>

        {renderTabContent()}

        <SpyRoute pageName={SecurityPageName.entityAnalyticsEndpointAssets} />
      </SecuritySolutionPageWrapper>

      {isOsqueryFlyoutOpen && hostData?.agent?.id && (
        <OsqueryFlyout agentId={hostData.agent.id} onClose={handleCloseOsqueryFlyout} />
      )}
    </>
  );
});

HostDetailsPage.displayName = 'HostDetailsPage';
