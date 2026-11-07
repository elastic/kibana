/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiAccordion, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useNavigateToAlertsPageWithFilters } from '../../../common/hooks/use_navigate_to_alerts_page_with_filters';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useLicense } from '../../../common/hooks/use_license';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useHuntingLeads } from '../../components/threat_hunting/top_threat_hunting_leads/use_hunting_leads';
import type { IntelligenceEntity } from './common';
import { useEntityStoreStats } from './hooks/use_entity_store_stats';
import { useCompactAnomalies } from './hooks/use_compact_anomalies';
import { useIntelligenceEntityList } from './hooks/use_intelligence_entity_list';
import { useTacticCoverage } from './hooks/use_tactic_coverage';
import { useDefaultAiConnector } from './hooks/use_default_ai_connector';
import { OverviewOperations } from './overview_operations';
import { RiskConcentration } from './risk_concentration';
import { ExposureLeaders } from './exposure_leaders';
import { AttackSurfaceCoverage } from './attack_surface_coverage';
import type { AttackTechniqueDrill } from './attack_surface_coverage';
import { PeerOutliers } from './peer_outliers';
import { IntelligenceSignals } from './intelligence_signals';
import { ExecutiveBriefModal } from './executive_brief_modal';
import type { ExecutiveBriefCoverage } from './executive_brief_agents';
import type { ConcentrationFilter } from './overview_metrics';
import { buildAttackMatrix, isFilterRelevant } from './overview_metrics';
import { staggeredEntrance } from './animations';

const OVERVIEW_ENTITY_FETCH_SIZE = 50;

export interface OverviewTabProps {
  onDrillToExplorer: (entity: IntelligenceEntity) => void;
  onViewAllEntities: () => void;
  onInvestigateAgent?: (id: string) => void;
  onInvestigateCodex?: (key: string) => void;
  onInvestigateCursor?: (key: string) => void;
  onInvestigateClaudeDesktop?: (key: string) => void;
  onInvestigateGoogleAdk?: (key: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  onDrillToExplorer,
  onViewAllEntities,
  onInvestigateAgent,
  onInvestigateCodex,
  onInvestigateCursor,
  onInvestigateClaudeDesktop,
  onInvestigateGoogleAdk,
}) => {
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();
  const resolvedSpaceId = spaceId ?? 'default';
  const [concentrationFilter, setConcentrationFilter] = useState<ConcentrationFilter | undefined>();
  const [isBriefOpen, setIsBriefOpen] = useState(false);

  const {
    entities,
    isLoading: isEntitiesLoading,
    isError: isEntitiesError,
  } = useIntelligenceEntityList({
    perPage: OVERVIEW_ENTITY_FETCH_SIZE,
  });

  // Drop a stale filter whenever a refreshed snapshot no longer contains any
  // matching entity, so an invisible filter can't blank the leaders panel.
  const activeConcentrationFilter =
    !isEntitiesLoading && !isFilterRelevant(concentrationFilter, entities)
      ? undefined
      : concentrationFilter;
  const { stats, isLoading: isStatsLoading, isError: isStatsError } = useEntityStoreStats(spaceId);
  const {
    anomalies: loadedAnomalies,
    isLoading: isAnomaliesLoading,
    isError: isAnomaliesError,
    isPartial: isAnomaliesPartial,
  } = useCompactAnomalies(spaceId);
  const anomalies = isAnomaliesError ? [] : loadedAnomalies;
  const {
    tactics,
    topRules,
    isLoading: isTacticsLoading,
    isError: isTacticsError,
  } = useTacticCoverage();
  const attackMatrix = useMemo(() => buildAttackMatrix(tactics), [tactics]);
  const navigateToAlertsPageWithFilters = useNavigateToAlertsPageWithFilters();

  const drillToTechnique = useCallback(
    ({ techniqueId, techniqueName }: AttackTechniqueDrill) => {
      // Filter the alerts page by the technique so the CISO lands on the exact
      // evidence behind a cell. Prefer the canonical ID; fall back to the name.
      navigateToAlertsPageWithFilters(
        techniqueId
          ? {
              title: techniqueId,
              selected_options: [techniqueId],
              field_name: 'kibana.alert.rule.threat.technique.id',
            }
          : {
              title: techniqueName,
              selected_options: [techniqueName],
              field_name: 'kibana.alert.rule.threat.technique.name',
            }
      );
    },
    [navigateToAlertsPageWithFilters]
  );

  const isEnterprise = useLicense().isEnterprise();
  const leadGenerationEnabled =
    useIsExperimentalFeatureEnabled('leadGenerationEnabled') && isEnterprise;
  const { connectorId } = useDefaultAiConnector();
  const {
    leads: loadedLeads,
    totalCount: leadsCount,
    isLoading: isLeadsLoading,
    isError: isLeadsError,
  } = useHuntingLeads(connectorId, leadGenerationEnabled, resolvedSpaceId);

  const leads = isLeadsError ? [] : loadedLeads;

  const briefCoverage = useMemo<ExecutiveBriefCoverage>(
    () => ({
      entityStore: isStatsError ? 'unavailable' : isStatsLoading ? 'loading' : 'available',
      entities: isEntitiesError ? 'unavailable' : isEntitiesLoading ? 'loading' : 'available',
      detections: isTacticsError ? 'unavailable' : isTacticsLoading ? 'loading' : 'available',
      anomalies: isAnomaliesError
        ? 'unavailable'
        : isAnomaliesLoading
        ? 'loading'
        : isAnomaliesPartial
        ? 'partial'
        : 'available',
      huntingLeads: !leadGenerationEnabled
        ? 'disabled'
        : isLeadsError
        ? 'unavailable'
        : isLeadsLoading
        ? 'loading'
        : 'available',
    }),
    [
      isStatsError,
      isStatsLoading,
      isEntitiesError,
      isEntitiesLoading,
      isTacticsError,
      isTacticsLoading,
      isAnomaliesError,
      isAnomaliesPartial,
      isAnomaliesLoading,
      leadGenerationEnabled,
      isLeadsError,
      isLeadsLoading,
    ]
  );

  const concentrationRowStyle = css`
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(300px, 0.8fr);
    gap: ${euiTheme.size.m};
    align-items: stretch;

    @media (max-width: 980px) {
      grid-template-columns: 1fr;
    }
  `;

  const insightRowStyle = css`
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr);
    gap: ${euiTheme.size.m};
    align-items: stretch;

    @media (max-width: 980px) {
      grid-template-columns: 1fr;
    }
  `;

  return (
    <div data-test-subj="entityIntelligenceOverviewTab">
      <OverviewOperations
        stats={stats}
        entities={entities}
        onGenerateBrief={() => setIsBriefOpen(true)}
        entitiesLoading={isEntitiesLoading || isStatsLoading}
        entitiesUnavailable={isEntitiesError || isStatsError}
        onInvestigateEntity={onDrillToExplorer}
        onViewAllEntities={onViewAllEntities}
        onInvestigateAgent={onInvestigateAgent}
        onInvestigateCodex={onInvestigateCodex}
        onInvestigateCursor={onInvestigateCursor}
        onInvestigateClaudeDesktop={onInvestigateClaudeDesktop}
        onInvestigateGoogleAdk={onInvestigateGoogleAdk}
      />

      <EuiSpacer size="m" />
      <EuiAccordion
        id="overviewLandscapeInsights"
        paddingSize="m"
        buttonContent={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.landscapeContext',
          { defaultMessage: 'Explore risk concentration, hunting leads and detection coverage' }
        )}
      >
        <EuiSpacer size="m" />
        <div>
          <IntelligenceSignals
            entities={entities}
            leads={leads}
            leadsCount={leadGenerationEnabled && !isLeadsError ? leadsCount : 0}
            anomalies={anomalies}
            isLoading={isAnomaliesLoading || (leadGenerationEnabled && isLeadsLoading)}
            isUnavailable={isAnomaliesError || (leadGenerationEnabled && isLeadsError)}
            onInvestigate={onDrillToExplorer}
          />
        </div>

        <EuiSpacer size="l" />
        <div css={[concentrationRowStyle, staggeredEntrance(2)]}>
          <RiskConcentration
            stats={stats}
            entities={entities}
            isLoading={isEntitiesLoading || isStatsLoading}
            filter={activeConcentrationFilter}
            onFilterChange={setConcentrationFilter}
            onSelectEntity={onDrillToExplorer}
          />
          <ExposureLeaders
            entities={entities}
            isLoading={isEntitiesLoading}
            filter={activeConcentrationFilter}
            onClearFilter={() => setConcentrationFilter(undefined)}
            onSelect={onDrillToExplorer}
            onViewAllEntities={onViewAllEntities}
          />
        </div>

        <EuiSpacer size="l" />
        <div css={[insightRowStyle, staggeredEntrance(4)]}>
          <AttackSurfaceCoverage
            matrix={attackMatrix}
            isLoading={isTacticsLoading}
            isError={isTacticsError}
            onDrillTechnique={drillToTechnique}
          />
          <PeerOutliers
            entities={entities}
            isLoading={isEntitiesLoading}
            onSelect={onDrillToExplorer}
          />
        </div>
      </EuiAccordion>

      {isBriefOpen ? (
        <ExecutiveBriefModal
          onClose={() => setIsBriefOpen(false)}
          stats={stats}
          entities={entities}
          tactics={tactics}
          rules={topRules}
          matrix={attackMatrix}
          leads={leads}
          leadsCount={leadGenerationEnabled && !isLeadsError ? leadsCount : 0}
          anomalies={anomalies}
          onInvestigate={onDrillToExplorer}
          coverage={briefCoverage}
          onInvestigateAgent={onInvestigateAgent}
          onInvestigateCodex={onInvestigateCodex}
          onInvestigateCursor={onInvestigateCursor}
          onInvestigateClaudeDesktop={onInvestigateClaudeDesktop}
          onInvestigateGoogleAdk={onInvestigateGoogleAdk}
        />
      ) : null}
    </div>
  );
};
