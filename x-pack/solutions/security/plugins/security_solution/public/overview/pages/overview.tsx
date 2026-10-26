/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiShowFor, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { DASHBOARDS, OVERVIEW } from '../../app/translations';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { useFetchIndex } from '../../common/containers/source';

import { EventsByDataset } from '../components/events_by_dataset';
import { EventCounts } from '../components/event_counts';
import { StatefulSidebar } from '../components/sidebar';
import { SignalsByCategory } from '../components/signals_by_category';
import { inputsSelectors } from '../../common/store';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { EndpointNotice } from '../components/endpoint_notice';
import { useMessagesStorage } from '../../common/containers/local_storage/use_messages_storage';
import { ENDPOINT_METADATA_INDEX } from '../../../common/constants';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { ThreatIntelLinkPanel } from '../components/overview_cti_links';
import { useAllTiDataSources } from '../containers/overview_cti_links/use_all_ti_data_sources';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { useSelectedPatterns } from '../../data_view_manager/hooks/use_selected_patterns';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';
import {
  filterAlertsFromIndexPatterns,
  getAlertsIndexPatterns,
} from '../../common/components/visualization_actions/utils';
import { SecurityAppHeader } from '../../common/components/app_header';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useKibana } from '../../common/lib/kibana';
import { SearchWithDataView } from '../../common/components/search_with_data_view';
import { PageScope } from '../../data_view_manager/constants';

const OverviewComponent = () => {
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { from, deleteQuery, setQuery, to } = useGlobalTime();

  const { dataView, status } = useDataView();
  const selectedPatterns = useSelectedPatterns(dataView);
  const indicesExist = !!dataView.matchedIndices?.length;

  // Keep-list: patterns from the data view with alert-backing indices stripped
  // out. Used by `EventCounts` to scope the Host/Network REST queries to event
  // documents only. Remote event indices are preserved unchanged so that
  // Cross-Project Search continues to work through the data view.
  const eventIndexPatterns = useMemo(
    () => filterAlertsFromIndexPatterns(selectedPatterns),
    [selectedPatterns]
  );

  // Drop-list: only the alert-backing patterns from the data view. Passed to
  // the Events histogram as `excludedPatterns` so the chart emits a negated
  // `_index` filter (CPS-safe — does not allowlist the full scope).
  const alertIndexPatterns = useMemo(
    () => getAlertsIndexPatterns(selectedPatterns),
    [selectedPatterns]
  );

  const endpointMetadataIndex = useMemo<string[]>(() => {
    return [ENDPOINT_METADATA_INDEX];
  }, []);
  const [, { indexExists: metadataIndexExists }] = useFetchIndex(endpointMetadataIndex, true);
  const { addMessage, hasMessage } = useMessagesStorage();
  const hasDismissEndpointNoticeMessage: boolean = useMemo(
    () => hasMessage('management', 'dismissEndpointNotice'),
    [hasMessage]
  );

  const [dismissMessage, setDismissMessage] = useState<boolean>(hasDismissEndpointNoticeMessage);
  const dismissEndpointNotice = useCallback(() => {
    setDismissMessage(true);
    addMessage('management', 'dismissEndpointNotice');
  }, [addMessage]);
  const {
    endpointPrivileges: { canAccessFleet },
  } = useUserPrivileges();
  const { hasAlertsRead } = useAlertsPrivileges();
  const { tiDataSources: allTiDataSources, isInitiallyLoaded: isTiLoaded } = useAllTiDataSources();

  const { docLinks } = useKibana().services;
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const back = useMemo(
    () => ({
      href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.dashboards }),
      label: DASHBOARDS,
    }),
    [getSecuritySolutionUrl]
  );

  if (status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <>
      <SecuritySolutionPageWrapper>
        {/* The header must be a direct child of the wrapper, otherwise it does not stay sticky. */}
        <SecurityAppHeader
          title={OVERVIEW}
          spacing="largeBleed"
          back={back}
          docLink={docLinks.links.siem.guide}
          // Empty items still count as a menu, so the legacy data view picker is not remounted.
          menu={{ items: [] }}
        />
        {!indicesExist && (
          <>
            <EuiSpacer size="m" />
            <EmptyPrompt />
          </>
        )}
        {indicesExist && (
          <>
            <SearchWithDataView dataView={dataView} scope={PageScope.default} />
            {!dismissMessage && !metadataIndexExists && canAccessFleet && (
              <>
                <EndpointNotice onDismiss={dismissEndpointNotice} />
                <EuiSpacer size="l" />
              </>
            )}
            <EuiFlexGroup>
              <EuiShowFor sizes={['xl']}>
                <EuiFlexItem grow={1}>
                  <StatefulSidebar />
                </EuiFlexItem>
              </EuiShowFor>

              <EuiFlexItem grow={3}>
                <EuiFlexGroup direction="column" responsive={false} gutterSize="none">
                  {hasAlertsRead && (
                    <EuiFlexItem grow={false}>
                      <SignalsByCategory filters={filters} />
                      <EuiSpacer size="l" />
                    </EuiFlexItem>
                  )}

                  <EuiFlexItem grow={false}>
                    <EventsByDataset
                      deleteQuery={deleteQuery}
                      filters={filters}
                      from={from}
                      dataView={dataView}
                      excludedPatterns={alertIndexPatterns}
                      query={query}
                      queryType="overview"
                      to={to}
                    />
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EventCounts
                      filters={filters}
                      from={from}
                      indexNames={eventIndexPatterns}
                      dataView={dataView}
                      query={query}
                      setQuery={setQuery}
                      to={to}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup direction="row">
                      <EuiFlexItem grow={1}>
                        {isTiLoaded && (
                          <ThreatIntelLinkPanel
                            allTiDataSources={allTiDataSources}
                            deleteQuery={deleteQuery}
                            from={from}
                            setQuery={setQuery}
                            to={to}
                          />
                        )}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.overview} />
    </>
  );
};

export const StatefulOverview = React.memo(OverviewComponent);
