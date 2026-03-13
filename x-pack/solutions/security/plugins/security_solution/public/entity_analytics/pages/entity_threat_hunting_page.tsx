/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
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
import { CombinedRiskDonutChart } from '../components/threat_hunting/combined_risk_donut_chart';
import { AnomaliesPlaceholderPanel } from '../components/threat_hunting/anomalies_placeholder_panel';
import { ThreatHuntingEntitiesTable } from '../components/threat_hunting/threat_hunting_entities_table';
import { WatchlistFilter } from '../components/watchlists/watchlist_filter';
import { TopThreatHuntingLeads } from '../components/threat_hunting/top_threat_hunting_leads';
import { ThreatHuntingLeadsFlyout } from '../components/threat_hunting/top_threat_hunting_leads/threat_hunting_leads_flyout';
import { LeadProvenanceFlyout } from '../components/threat_hunting/top_threat_hunting_leads/lead_provenance_flyout';
import { useHuntingLeads } from '../components/threat_hunting/top_threat_hunting_leads/use_hunting_leads';
import { useLeadAttachment } from '../components/threat_hunting/top_threat_hunting_leads/use_lead_attachment';
import type { HuntingLead } from '../components/threat_hunting/top_threat_hunting_leads/types';

export const EntityThreatHuntingPage = () => {
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
  } = useHuntingLeads();
  const openAgentBuilderWithLead = useLeadAttachment();

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [provenanceLead, setProvenanceLead] = useState<HuntingLead | null>(null);

  const isSourcererLoading = useMemo(
    () => (newDataViewPickerEnabled ? status !== 'ready' : oldIsSourcererLoading),
    [newDataViewPickerEnabled, oldIsSourcererLoading, status]
  );

  const indicesExist = useMemo(
    () => (newDataViewPickerEnabled ? !!dataView?.matchedIndices?.length : oldIndicesExist),
    [dataView?.matchedIndices?.length, newDataViewPickerEnabled, oldIndicesExist]
  );

  const showEmptyPrompt = !indicesExist;

  const handleOpenFlyout = useCallback(() => {
    setIsFlyoutOpen(true);
  }, []);
  const handleCloseFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
  }, []);

  const handleLeadClick = useCallback(
    (lead: HuntingLead) => {
      openAgentBuilderWithLead(lead);
    },
    [openAgentBuilderWithLead]
  );

  const handleLeadInfoClick = useCallback((lead: HuntingLead) => {
    setProvenanceLead(lead);
  }, []);

  const handleCloseProvenance = useCallback(() => setProvenanceLead(null), []);

  const handleHuntInChat = useCallback(() => {
    const firstLead = leads[0];
    if (firstLead) {
      openAgentBuilderWithLead(firstLead);
    }
  }, [leads, openAgentBuilderWithLead]);

  const handleSelectLeadInFlyout = useCallback(
    (lead: HuntingLead) => {
      openAgentBuilderWithLead(lead);
    },
    [openAgentBuilderWithLead]
  );

  const handleInvestigateInChat = useCallback(
    (lead: HuntingLead) => {
      openAgentBuilderWithLead(lead);
    },
    [openAgentBuilderWithLead]
  );

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

      <SecuritySolutionPageWrapper data-test-subj="threatHuntingPage">
        <HeaderPage
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.threatHunting.pageTitle"
              defaultMessage="Entity Threat Hunting"
            />
          }
          rightSideItems={[<WatchlistFilter />]}
        />

        {isSourcererLoading ? (
          <EuiLoadingSpinner size="l" data-test-subj="threatHuntingLoader" />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="l">
            {/* Leads Section */}
            <EuiFlexItem>
              <TopThreatHuntingLeads
                leads={leads}
                totalCount={totalCount}
                isLoading={isLeadsLoading}
                isGenerating={isGenerating}
                onSeeAll={handleOpenFlyout}
                onLeadClick={handleLeadClick}
                onHuntInChat={handleHuntInChat}
                onLeadInfoClick={leadDetailsEnabled ? handleLeadInfoClick : undefined}
                onGenerate={generate}
              />
            </EuiFlexItem>

            {/* Donut Chart and Anomalies Panel Row */}
            <EuiFlexItem>
              <EuiPanel hasBorder>
                <EuiFlexGroup responsive={false} gutterSize="l">
                  <EuiFlexItem grow={1}>
                    <CombinedRiskDonutChart />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1}>
                    <AnomaliesPlaceholderPanel />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>

            {/* Entities Table */}
            <EuiFlexItem>
              <ThreatHuntingEntitiesTable />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.entityAnalyticsThreatHunting} />

      {isFlyoutOpen && (
        <ThreatHuntingLeadsFlyout
          onClose={handleCloseFlyout}
          onSelectLead={handleSelectLeadInFlyout}
          onInfoClick={leadDetailsEnabled ? handleLeadInfoClick : undefined}
        />
      )}

      {provenanceLead && (
        <LeadProvenanceFlyout
          lead={provenanceLead}
          onClose={handleCloseProvenance}
          onInvestigateInChat={handleInvestigateInChat}
        />
      )}
    </>
  );
};
