/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { Entity } from '../../../../../common/api/entity_analytics';
import { useAnomalyOverview } from '../../../../entity_analytics/api/hooks/use_anomaly_overview';
import { useAnomalyPrivileges } from '../../../../entity_analytics/api/hooks/use_anomaly_privileges';
import { ObservedDataSection } from '../../shared/components/observed_data_section';
import { useHasEntityResolutionLicense } from '../../../../common/hooks/use_has_entity_resolution_license';
import { EntityHighlightsAccordion } from '../../../../entity_analytics/components/entity_details_flyout/components/entity_highlights';
import { EntityInsight } from '../../../../cloud_security_posture/components/entity_insight';
import { AssetCriticalityAccordion } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { FlyoutRiskSummary } from '../../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../../entity_analytics/api/hooks/use_risk_score';
import type { EntityRiskScoresState } from '../../../../entity_analytics/api/hooks/use_entity_risk_scores';
import { EntityIdentifierFields, EntityType } from '../../../../../common/entity_analytics/types';
import { USER_PANEL_OBSERVED_USER_QUERY_ID, USER_PANEL_RISK_SCORE_QUERY_ID } from './constants';
import type { EntityDetailsPath } from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import type { IdentityFields } from '../../../../flyout/document_details/shared/utils';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import type { EntityRiskScore, UserItem } from '../../../../../common/search_strategy';
import { VisualizationsSection } from '../../../../flyout/entity_details/shared/components/right/visualizations_section';
import { ResolutionSection } from '../../../../entity_analytics/components/entity_resolution/resolution_section';
import {
  AnomaliesSection,
  EMPTY_ANOMALY_OVERVIEW,
} from '../../../../entity_analytics/components/anomalies/anomalies_section';
import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';

export type ObservedUserData = Omit<ObservedEntityData<UserItem>, 'anomalies'> & {
  entityRecord?: EntityStoreRecord | null;
  refetchEntityStore?: () => void;
};

export interface ContentProps {
  /** Observed user data (anomalies excluded). */
  observedUser: ObservedUserData;
  /** Current risk score state for the user. */
  riskScoreState: RiskScoreState<EntityType.user>;
  /** Base + resolution entity risk scores (Entity Store v2). */
  entityRiskScores: EntityRiskScoresState<EntityType.user>;
  /** Unique context ID passed to child queries. */
  contextID: string;
  /** Scope ID for the timeline or table that opened this flyout. */
  scopeId: string;
  /** Callback to navigate to a detail panel (e.g. risk inputs, asset criticality). */
  openDetailsPanel: (path: EntityDetailsPath) => void;
  /** Key-value map of identity fields used to resolve the user. */
  identityFields: IdentityFields;
  /** Callback invoked after asset criticality is updated. */
  onAssetCriticalityChange: () => void;
  /** Whether the risk score is currently being recalculated. */
  recalculatingScore: boolean;
  /** Whether the flyout is rendered in preview mode. */
  isPreviewMode: boolean;
  /** When using Entity Store v2: entity record for asset criticality upsert. */
  entityRecord?: Entity;
  refetchEntityRecord?: () => void;
  /** When true (e.g. entity store v2 enabled but no entity found), hide risk score and asset criticality. */
  skipRiskAndCriticality?: boolean;
  /** Entity store entity ID for the user. */
  entityStoreEntityId?: string;
  /** See {@link RiskSummaryProps.prefetchedResolutionRisk}. */
  prefetchedResolutionRisk?: EntityRiskScore<EntityType.user>;
  /**
   * Whether the caller's `openDetailsPanel` can navigate to the graph view and resolution group
   * tabs. The v1 `UserPanel` and the agent-builder canvas forward those tabs to a left panel that
   * renders them, so they leave this on. The v2 `User` flyout does not yet wire up those tabs, so
   * it sets this to `false` to hide the (otherwise no-op) Show-graph icon and Resolution-group link.
   */
  enableGraphAndResolutionNavigation?: boolean;
  /** When true, hides the chevron icons in the risk summary and alerts section headers. Used by the v2 flyout. */
  hideHeaderIcons?: boolean;
  /**
   * When provided, clicking a related entity in the resolution section is delegated to this callback
   * (used by the new EUI system flyout) instead of the legacy expandable flyout.
   */
  onShowEntity?: (params: {
    engineType: string | undefined;
    entityId: string;
    entityName: string | undefined;
  }) => void;
}

/**
 * User details flyout content section.
 */
export const Content = ({
  identityFields,
  observedUser,
  riskScoreState,
  entityRiskScores,
  recalculatingScore,
  contextID,
  scopeId,
  openDetailsPanel,
  onAssetCriticalityChange,
  isPreviewMode,
  entityRecord,
  refetchEntityRecord,
  skipRiskAndCriticality = false,
  entityStoreEntityId,
  prefetchedResolutionRisk,
  enableGraphAndResolutionNavigation = true,
  hideHeaderIcons = false,
  onShowEntity,
}: ContentProps) => {
  const hasEntityResolutionLicense = useHasEntityResolutionLicense();
  const isAnomalyDetailsEnabled = useIsExperimentalFeatureEnabled('entityAnalyticsAnomalyDetails');
  const { data: anomalyPrivilegesData } = useAnomalyPrivileges(isAnomalyDetailsEnabled);
  const hasAnomalyPrivileges = anomalyPrivilegesData?.has_all_required ?? false;
  const loadAnomalies = isAnomalyDetailsEnabled && hasAnomalyPrivileges && !!entityStoreEntityId;

  const anomalyOverview = useAnomalyOverview({
    entityId: entityStoreEntityId ?? '',
    entityType: EntityType.user,
    enabled: loadAnomalies,
  });

  const userName =
    identityFields[EntityIdentifierFields.userName] || Object.values(identityFields)[0] || '';

  return (
    <>
      {!skipRiskAndCriticality && (
        <EntityHighlightsAccordion
          entityIdentifier={entityRecord?.entity?.id ?? userName}
          entityType={EntityType.user}
          entityRecord={entityRecord}
          refetchEntityRecord={refetchEntityRecord}
        />
      )}
      {!skipRiskAndCriticality &&
        riskScoreState.hasEngineBeenInstalled &&
        (riskScoreState.loading || (riskScoreState.data?.length ?? 0) > 0) && (
          <>
            <FlyoutRiskSummary
              entityType={EntityType.user}
              riskScoreData={riskScoreState}
              entityRiskScores={entityRiskScores}
              recalculatingScore={recalculatingScore}
              queryId={USER_PANEL_RISK_SCORE_QUERY_ID}
              openDetailsPanel={openDetailsPanel}
              isPreviewMode={isPreviewMode}
              entityId={entityRecord?.entity?.id}
              prefetchedResolutionRisk={prefetchedResolutionRisk}
              hideHeaderIcon={hideHeaderIcons}
            />
            <EuiHorizontalRule />
          </>
        )}
      {loadAnomalies &&
        (anomalyOverview.isLoading || anomalyOverview.isError || anomalyOverview.data) && (
          <>
            <AnomaliesSection
              data={anomalyOverview.data ?? EMPTY_ANOMALY_OVERVIEW}
              entityId={entityStoreEntityId}
              isPreviewMode={isPreviewMode}
              openDetailsPanel={openDetailsPanel}
              hideHeaderIcons={hideHeaderIcons}
              isLoading={anomalyOverview.isLoading}
              isError={anomalyOverview.isError}
            />
          </>
        )}
      {entityStoreEntityId && (
        <>
          <VisualizationsSection
            entityId={entityStoreEntityId}
            isPreviewMode={isPreviewMode}
            scopeId={scopeId}
            openDetailsPanel={enableGraphAndResolutionNavigation ? openDetailsPanel : undefined}
            hideHeaderIcons={hideHeaderIcons}
          />
          <EuiHorizontalRule margin="m" />
        </>
      )}
      {entityStoreEntityId && !isPreviewMode && hasEntityResolutionLicense && (
        <>
          <ResolutionSection
            entityId={entityStoreEntityId}
            entityType={EntityType.user}
            scopeId={scopeId}
            openDetailsPanel={enableGraphAndResolutionNavigation ? openDetailsPanel : undefined}
            onShowEntity={onShowEntity}
            hideHeaderIcons={hideHeaderIcons}
          />
          <EuiHorizontalRule />
        </>
      )}
      {!skipRiskAndCriticality && !entityRecord && (
        <AssetCriticalityAccordion
          entity={{ name: userName, type: EntityType.user }}
          onChange={onAssetCriticalityChange}
        />
      )}
      <EntityInsight
        entityRecord={entityRecord}
        identityFields={identityFields}
        isPreviewMode={isPreviewMode}
        openDetailsPanel={openDetailsPanel}
        entityType={EntityType.user}
        hideHeaderIcons={hideHeaderIcons}
      />
      <ObservedDataSection
        entityType={EntityType.user}
        observedData={observedUser}
        contextID={contextID}
        identityFields={identityFields}
        entityRecord={entityRecord}
        scopeId={scopeId}
        queryId={USER_PANEL_OBSERVED_USER_QUERY_ID}
      />
    </>
  );
};
