/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTitle,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { PageLoader } from '../../common/components/page_loader';
import { PageScope } from '../../data_view_manager/constants';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { EntityAnalyticsRecentAnomalies } from '../components/home/anomalies_panel';
import { WatchlistFilter } from '../components/watchlists/watchlist_filter';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import {
  ENTITY_ANALYTICS_LOCAL_STORAGE_COLUMNS_KEY,
  ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
} from '../components/home/constants';
import {
  EntitiesTableSection,
  DataViewContext,
  useEntityURLState,
  type EntitiesBaseURLQuery,
  type URLQuery,
} from '../components/home/entities_table';
import { DynamicRiskLevelPanel } from '../components/home/dynamic_risk_level_panel';
import { TopThreatHuntingLeads } from '../components/threat_hunting/top_threat_hunting_leads';
import { ThreatHuntingLeadsFlyout } from '../components/threat_hunting/top_threat_hunting_leads/threat_hunting_leads_flyout';
import { LeadProvenanceFlyout } from '../components/threat_hunting/top_threat_hunting_leads/lead_provenance_flyout';
import { useHuntingLeads } from '../components/threat_hunting/top_threat_hunting_leads/use_hunting_leads';
import { useLeadAttachment } from '../components/threat_hunting/top_threat_hunting_leads/use_lead_attachment';
import type { HuntingLead } from '../components/threat_hunting/top_threat_hunting_leads/types';

const getDefaultQuery = ({ query, filters }: EntitiesBaseURLQuery): URLQuery => ({
  query,
  filters,
  pageFilters: [],
  sort: [['@timestamp', 'desc']],
});

export const EntityAnalyticsHomePage = () => {
  const {
    indicesExist: oldIndicesExist,
    loading: oldIsSourcererLoading,
    sourcererDataView: oldSourcererDataViewSpec,
  } = useSourcererDataView();
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const leadDetailsEnabled = useIsExperimentalFeatureEnabled('leadGenerationDetailsEnabled');
  const { dataView, status } = useDataView(PageScope.explore);

  const {
    leads,
    totalCount,
    isLoading: isLeadsLoading,
    isGenerating,
    generate,
    isScheduled,
    toggleSchedule,
  } = useHuntingLeads();
  const openAgentBuilderWithLead = useLeadAttachment();

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [provenanceLead, setProvenanceLead] = useState<HuntingLead | null>(null);

  const isSourcererLoading = useMemo(
    () => (newDataViewPickerEnabled ? status !== 'ready' : oldIsSourcererLoading),
    [newDataViewPickerEnabled, oldIsSourcererLoading, status]
  );

  const location = useLocation();
  const history = useHistory();

  const selectedWatchlistId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('watchlistId') || undefined;
  }, [location.search]);

  const selectedWatchlistName = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('watchlistName') || undefined;
  }, [location.search]);

  const setSelectedWatchlist = useCallback(
    (id?: string, name?: string) => {
      const params = new URLSearchParams(location.search);
      if (id) {
        params.set('watchlistId', id);
      } else {
        params.delete('watchlistId');
      }
      if (name) {
        params.set('watchlistName', name);
      } else {
        params.delete('watchlistName');
      }
      history.replace({ ...location, search: params.toString() });
    },
    [location, history]
  );

  const indicesExist = useMemo(
    () => (newDataViewPickerEnabled ? !!dataView?.matchedIndices?.length : oldIndicesExist),
    [dataView?.matchedIndices?.length, newDataViewPickerEnabled, oldIndicesExist]
  );

  const isXlScreen = useIsWithinBreakpoints(['l', 'xl']);
  const showEmptyPrompt = !indicesExist;

  const handleOpenFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const handleCloseFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  const handleOpenLeadInChat = useCallback(
    (lead: HuntingLead) => openAgentBuilderWithLead(lead),
    [openAgentBuilderWithLead]
  );

  const handleLeadInfoClick = useCallback((lead: HuntingLead) => setProvenanceLead(lead), []);

  const handleCloseProvenance = useCallback(() => setProvenanceLead(null), []);

  const handleHuntInChat = useCallback(() => {
    const firstLead = leads[0];
    if (firstLead) {
      openAgentBuilderWithLead(firstLead);
    }
  }, [leads, openAgentBuilderWithLead]);

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  if (showEmptyPrompt) {
    return <EmptyPrompt />;
  }

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar
          dataView={dataView}
          id={InputsModelId.global}
          sourcererDataViewSpec={oldSourcererDataViewSpec}
        />
      </FiltersGlobal>

      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsHomePage">
        <HeaderPage
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.homePage.pageTitle"
              defaultMessage="Entity Analytics"
            />
          }
          rightSideItems={[
            <WatchlistFilter
              selectedId={selectedWatchlistId ?? ''}
              onChangeSelectedId={setSelectedWatchlist}
            />,
          ]}
        />

        {isSourcererLoading ? (
          <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsHomePageLoader" />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="l">
            <EuiFlexItem>
              <TopThreatHuntingLeads
                leads={leads}
                totalCount={totalCount}
                isLoading={isLeadsLoading}
                isGenerating={isGenerating}
                onSeeAll={handleOpenFlyout}
                onLeadClick={handleOpenLeadInChat}
                onHuntInChat={handleHuntInChat}
                onLeadInfoClick={leadDetailsEnabled ? handleLeadInfoClick : undefined}
                onGenerate={generate}
                isScheduled={isScheduled}
                onToggleSchedule={toggleSchedule}
              />
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFlexGroup
                direction={isXlScreen ? 'row' : 'column'}
                responsive={false}
                gutterSize="l"
              >
                <EuiFlexItem grow={1}>
                  <EuiPanel hasBorder>
                    <DynamicRiskLevelPanel
                      watchlistId={selectedWatchlistId}
                      watchlistName={selectedWatchlistName}
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <EuiPanel hasBorder>
                    <EntityAnalyticsRecentAnomalies watchlistId={selectedWatchlistId} />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiPanel hasBorder>
              <EntityAnalyticsEntitiesTable
                watchlistId={selectedWatchlistId}
                watchlistName={selectedWatchlistName}
              />
            </EuiPanel>
          </EuiFlexGroup>
        )}
      </SecuritySolutionPageWrapper>

      {isFlyoutOpen && (
        <ThreatHuntingLeadsFlyout
          onClose={handleCloseFlyout}
          onSelectLead={handleOpenLeadInChat}
          onInfoClick={leadDetailsEnabled ? handleLeadInfoClick : undefined}
        />
      )}

      {provenanceLead && (
        <LeadProvenanceFlyout
          lead={provenanceLead}
          onClose={handleCloseProvenance}
          onInvestigateInChat={handleOpenLeadInChat}
        />
      )}

      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};

const EntityAnalyticsEntitiesTable = ({
  watchlistId,
  watchlistName,
}: {
  watchlistId?: string;
  watchlistName?: string;
}) => {
  const spaceId = useSpaceId();
  const { dataView: entityDataView, isLoading: entityDataViewLoading } =
    useEntityStoreDataView(spaceId);

  if (entityDataViewLoading || !entityDataView) {
    return <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsEntitiesTableLoader" />;
  }

  const dataViewContextValue = {
    dataView: entityDataView,
    dataViewIsLoading: entityDataViewLoading,
  };

  return (
    <DataViewContext.Provider value={dataViewContextValue}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h3>
            {watchlistId ? (
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.homePage.entitiesTableTitleWithWatchlist"
                defaultMessage="{watchlistName} entities"
                values={{
                  watchlistName: watchlistName ?? watchlistId,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.homePage.entitiesTableTitle"
                defaultMessage="Entities"
              />
            )}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EntityAnalyticsEntitiesTableContent watchlistId={watchlistId} />
    </DataViewContext.Provider>
  );
};

const EntityAnalyticsEntitiesTableContent = ({ watchlistId }: { watchlistId?: string }) => {
  const urlState = useEntityURLState({
    paginationLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
    columnsLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_COLUMNS_KEY,
    defaultQuery: getDefaultQuery,
  });

  const state = useMemo(() => {
    if (!watchlistId) return urlState;

    return {
      ...urlState,
      query: {
        ...urlState.query,
        bool: {
          ...urlState.query?.bool,
          filter: [
            ...(urlState.query?.bool?.filter ?? []),
            { term: { 'entity.attributes.watchlists': watchlistId } },
          ],
        },
      },
    };
  }, [urlState, watchlistId]);

  return <EntitiesTableSection state={state} />;
};
