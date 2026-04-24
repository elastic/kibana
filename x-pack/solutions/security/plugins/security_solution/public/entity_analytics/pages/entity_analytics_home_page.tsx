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
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useKibana } from '../../common/lib/kibana';
import { EntityEventTypes } from '../../common/lib/telemetry';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useLicense } from '../../common/hooks/use_license';
import { PageLoader } from '../../common/components/page_loader';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useStoredAssistantConnectorId } from '../../onboarding/components/hooks/use_stored_state';
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
import { useEntityStoreStatus } from '../components/entity_store/hooks/use_entity_store';
import { EntityStoreDisabledEmptyPrompt } from './entity_store_disabled_empty_prompt';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { TabId } from './entity_analytics_management_page';
import { TopThreatHuntingLeads } from '../components/threat_hunting/top_threat_hunting_leads';
import { ThreatHuntingLeadsFlyout } from '../components/threat_hunting/top_threat_hunting_leads/threat_hunting_leads_flyout';
import { useHuntingLeads } from '../components/threat_hunting/top_threat_hunting_leads/use_hunting_leads';
import { useLeadAttachment } from '../components/threat_hunting/top_threat_hunting_leads/use_lead_attachment';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import type { HuntingLead } from '../components/threat_hunting/top_threat_hunting_leads/types';

const getDefaultQuery = ({ query, filters }: EntitiesBaseURLQuery): URLQuery => ({
  query,
  filters,
  pageFilters: [],
  sort: [['@timestamp', 'desc']],
});

export const EntityAnalyticsHomePage = () => {
  const { telemetry, agentBuilder, http } = useKibana().services;
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
  const { data: availableConnectors } = useLoadConnectors({ http, featureId: 'lead_generation' });
  const {
    indicesExist: oldIndicesExist,
    loading: oldIsSourcererLoading,
    sourcererDataView: oldSourcererDataViewSpec,
  } = useSourcererDataView();
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const isEnterprise = useLicense().isEnterprise();
  const leadGenerationEnabled =
    useIsExperimentalFeatureEnabled('leadGenerationEnabled') && isEnterprise;
  const spaceId = useSpaceId();
  const { dataView: entityDataView, isLoading: entityDataViewLoading } =
    useEntityStoreDataView(spaceId);

  const resolvedSpaceId = spaceId ?? 'default';
  const [storedConnectorId, setStoredConnectorId] = useStoredAssistantConnectorId(resolvedSpaceId);
  const connectorId = spaceId ? storedConnectorId ?? '' : '';
  const hasValidConnector = !!availableConnectors?.find((c) => c.id === connectorId);
  const safeSetConnectorId = useCallback(
    (id: string | undefined) => {
      if (spaceId) {
        setStoredConnectorId(id);
      }
    },
    [spaceId, setStoredConnectorId]
  );
  const {
    leads,
    totalCount,
    isLoading: isLeadsLoading,
    isGenerating,
    hasGenerated,
    lastRunTimestamp,
    generate,
    isScheduled,
    toggleSchedule,
  } = useHuntingLeads(connectorId, leadGenerationEnabled);
  const openAgentBuilderWithLead = useLeadAttachment();

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const isSourcererLoading = useMemo(
    () => (newDataViewPickerEnabled ? entityDataViewLoading : oldIsSourcererLoading),
    [newDataViewPickerEnabled, oldIsSourcererLoading, entityDataViewLoading]
  );

  const location = useLocation();
  const history = useHistory();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

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
    () => (newDataViewPickerEnabled ? !entityDataViewLoading : oldIndicesExist),
    [entityDataViewLoading, newDataViewPickerEnabled, oldIndicesExist]
  );

  const isXlScreen = useIsWithinBreakpoints(['l', 'xl']);
  const showEmptyPrompt = !indicesExist;

  const { data: entityStoreStatusData } = useEntityStoreStatus();
  const entityStoreDisabled =
    entityStoreStatusData?.status === 'not_installed' ||
    entityStoreStatusData?.status === 'stopped';

  const handleOpenFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const handleCloseFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  const handleOpenLeadInChat = useCallback(
    (lead: HuntingLead) => {
      telemetry.reportEvent(EntityEventTypes.LeadGenerationLeadClicked, {});
      openAgentBuilderWithLead(lead);
    },
    [openAgentBuilderWithLead, telemetry]
  );

  const handleHuntInChat = useCallback(() => {
    agentBuilder?.openChat({ newConversation: true, sessionTag: 'security' });
  }, [agentBuilder]);

  if (newDataViewPickerEnabled && entityDataViewLoading) {
    return <PageLoader />;
  }

  if (showEmptyPrompt) {
    return <EmptyPrompt />;
  }

  if (entityStoreDisabled) {
    return <EntityStoreDisabledEmptyPrompt />;
  }

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar
          dataView={entityDataView}
          id={InputsModelId.global}
          sourcererDataViewSpec={oldSourcererDataViewSpec}
        />
      </FiltersGlobal>

      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsHomePage">
        <HeaderPage
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.homePage.pageTitle"
              defaultMessage="Entity analytics"
            />
          }
          rightSideItems={[
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <WatchlistFilter
                  selectedId={selectedWatchlistId ?? ''}
                  onChangeSelectedId={setSelectedWatchlist}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  display="base"
                  iconType="gear"
                  size="m"
                  aria-label={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.homePage.watchlistsSettingsButtonAriaLabel',
                    { defaultMessage: 'Watchlists settings' }
                  )}
                  href={getSecuritySolutionUrl({
                    deepLinkId: SecurityPageName.entityAnalyticsManagement,
                    path: `/${TabId.Watchlists}`,
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>,
          ]}
        />

        {isSourcererLoading ? (
          <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsHomePageLoader" />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="l">
            {leadGenerationEnabled && (
              <EuiFlexItem>
                <TopThreatHuntingLeads
                  leads={leads}
                  totalCount={totalCount}
                  isLoading={isLeadsLoading}
                  isGenerating={isGenerating}
                  hasGenerated={hasGenerated}
                  lastRunTimestamp={lastRunTimestamp}
                  isScheduled={isScheduled}
                  onToggleSchedule={toggleSchedule}
                  onSeeAll={handleOpenFlyout}
                  onLeadClick={handleOpenLeadInChat}
                  onHuntInChat={handleHuntInChat}
                  onGenerate={generate}
                  connectorId={connectorId}
                  hasValidConnector={hasValidConnector}
                  onConnectorIdSelected={safeSetConnectorId}
                  isAgentChatExperienceEnabled={isAgentChatExperienceEnabled}
                />
              </EuiFlexItem>
            )}

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
                entityDataView={entityDataView}
                entityDataViewLoading={entityDataViewLoading}
              />
            </EuiPanel>
          </EuiFlexGroup>
        )}
      </SecuritySolutionPageWrapper>

      {leadGenerationEnabled && isFlyoutOpen && (
        <ThreatHuntingLeadsFlyout onClose={handleCloseFlyout} onSelectLead={handleOpenLeadInChat} />
      )}

      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};

const EntityAnalyticsEntitiesTable = ({
  watchlistId,
  watchlistName,
  entityDataView,
  entityDataViewLoading,
}: {
  watchlistId?: string;
  watchlistName?: string;
  entityDataView: ReturnType<typeof useEntityStoreDataView>['dataView'];
  entityDataViewLoading: boolean;
}) => {
  if (entityDataViewLoading) {
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
