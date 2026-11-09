/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import React from 'react';
import type { EntityRiskScore, ServiceItem } from '../../../../../common/search_strategy';
import type { Entity } from '../../../../../common/api/entity_analytics';
import { AssetCriticalityAccordion } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { EntityHighlightsAccordion } from '../../../../entity_analytics/components/entity_details_flyout/components/entity_highlights';
import { FlyoutRiskSummary } from '../../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../../entity_analytics/api/hooks/use_risk_score';
import type { EntityRiskScoresState } from '../../../../entity_analytics/api/hooks/use_entity_risk_scores';
import { EntityIdentifierFields, EntityType } from '../../../../../common/entity_analytics/types';
import type { EntityViewMode } from '../../../../../common/entity_analytics/entity_store/resolution_group';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import { ObservedDataSection } from '../../shared/components/observed_data_section';
import { EntityInsight } from '../../../../cloud_security_posture/components/entity_insight';
import type { IdentityFields } from '../../../../flyout/document_details/shared/utils';
import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { EntityDetailsPath } from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { VisualizationsSection } from '../../../../flyout/entity_details/shared/components/right/visualizations_section';
import { ResolutionSection } from '../../../../entity_analytics/components/entity_resolution/resolution_section';
import { useNewEntityAnalyticsPage } from '../../../../entity_analytics/hooks/use_new_entity_analytics_page';
import { useHasEntityResolutionLicense } from '../../../../common/hooks/use_has_entity_resolution_license';
import { SERVICE_PANEL_OBSERVED_SERVICE_QUERY_ID } from './constants';

type ObservedServiceData = Omit<ObservedEntityData<ServiceItem>, 'anomalies'>;

export interface ContentProps {
  /** Observed service data */
  observedService: ObservedServiceData;
  /** Current risk score state for the service. */
  riskScoreState: RiskScoreState<EntityType.service>;
  /** Base + resolution entity risk scores (Entity Store v2). */
  entityRiskScores: EntityRiskScoresState<EntityType.service>;
  /** Unique context ID passed to child queries. */
  contextID: string;
  /** Scope ID for the timeline or table that opened this flyout. */
  scopeId: string;
  /** Callback to navigate to a detail panel (e.g. risk inputs, asset criticality). */
  openDetailsPanel: (path: EntityDetailsPath) => void;
  /** Identity fields resolving the service. */
  identityFields: IdentityFields;
  /** Callback invoked after asset criticality is updated. */
  onAssetCriticalityChange: () => void;
  /** Whether the risk score is currently being recalculated. */
  recalculatingScore: boolean;
  /** Whether the flyout is rendered in preview mode. */
  isPreviewMode: boolean;
  /** When using Entity Store v2: entity record for asset criticality upsert. */
  entityRecord?: Entity;
  /**
   * Resolution-group aliases of `entityRecord` (empty outside the group view). Insights are then
   * counted across the whole group.
   */
  aliasRecords?: readonly EntityStoreRecord[];
  /** Refetch entity store record after AI summary persist (v2). */
  refetchEntityRecord?: () => void;
  /** When true (the service was not found in the entity store), hide entity highlights and risk score. */
  noEntityInStore?: boolean;
  /** True while the entity store record is being resolved (v2); the AI summary waits for it. */
  isEntityRecordLoading?: boolean;
  /** When `true`, hide the legacy asset criticality accordion. Required so every call site wires it explicitly. */
  entityStoreV2Enabled: boolean;
  /** Entity store entity ID for the service. */
  entityStoreEntityId?: string;
  /** Entity view mode of the panel; `resolved` loads AI summary for the whole resolution group. */
  mode?: EntityViewMode;
  /** See {@link RiskSummaryProps.prefetchedResolutionRisk}. */
  prefetchedResolutionRisk?: EntityRiskScore<EntityType.service>;
  /** When true, hides the chevron icons in the risk summary and alerts section headers. Used by the v2 flyout. */
  hideHeaderIcons?: boolean;
  /**
   * When provided, clicking a related entity in the resolution section is delegated to this
   * callback (used by the new EUI system flyout) instead of the legacy expandable flyout.
   */
  onShowEntity?: (params: {
    engineType: string | undefined;
    entityId: string;
    entityName: string | undefined;
  }) => void;
  /**
   * Inspect query id for {@link FlyoutRiskSummary}. Callers must pass a stable id that matches
   * their `useQueryInspector` registration
   */
  riskScoreQueryId: string;
  /**
   * True when the flyout shows a resolution group (alias records were loaded for the open target).
   * The risk summary then shows only the group's risk score. See {@link RiskSummaryProps.isGroupView}.
   */
  isGroupView?: boolean;
}

/**
 * Content for the service details flyout.
 */
export const Content = ({
  entityRecord,
  refetchEntityRecord,
  isEntityRecordLoading = false,
  observedService,
  riskScoreState,
  entityRiskScores,
  recalculatingScore,
  contextID,
  scopeId,
  isPreviewMode,
  openDetailsPanel,
  onAssetCriticalityChange,
  entityStoreV2Enabled,
  entityStoreEntityId,
  prefetchedResolutionRisk,
  onShowEntity,
  riskScoreQueryId,
  hideHeaderIcons = false,
  isGroupView = false,
  mode,
  identityFields,
  aliasRecords,
  noEntityInStore = false,
}: ContentProps) => {
  const hasEntityResolutionLicense = useHasEntityResolutionLicense();
  const isNewEntityAnalyticsPage = useNewEntityAnalyticsPage();

  // Extract serviceName from identityFields for components that need a string
  // Priority: identityFields['service.name'] > identityFields[first key]
  const serviceName =
    identityFields[EntityIdentifierFields.serviceName] || Object.values(identityFields)[0] || '';

  const resolutionSection =
    entityStoreEntityId && !isPreviewMode && hasEntityResolutionLicense ? (
      <>
        <ResolutionSection
          entityId={entityStoreEntityId}
          entityType={EntityType.service}
          scopeId={scopeId}
          openDetailsPanel={openDetailsPanel}
          onShowEntity={onShowEntity}
          hideHeaderIcons={hideHeaderIcons}
          mode={mode}
        />
        <EuiHorizontalRule />
      </>
    ) : null;

  return (
    <>
      {!noEntityInStore && (
        <EntityHighlightsAccordion
          entityIdentifier={entityRecord ? entityRecord.entity?.id ?? serviceName : serviceName}
          entityType={EntityType.service}
          entityRecord={entityRecord}
          refetchEntityRecord={refetchEntityRecord}
          mode={mode}
          isEntityRecordLoading={isEntityRecordLoading}
        />
      )}
      {!noEntityInStore &&
        riskScoreState.hasEngineBeenInstalled &&
        (riskScoreState.loading || (riskScoreState.data?.length ?? 0) > 0) && (
          <>
            <FlyoutRiskSummary
              riskScoreData={riskScoreState}
              entityRiskScores={entityRiskScores}
              recalculatingScore={recalculatingScore}
              queryId={riskScoreQueryId}
              openDetailsPanel={openDetailsPanel}
              isPreviewMode={isPreviewMode}
              entityType={EntityType.service}
              entityId={entityRecord?.entity?.id}
              prefetchedResolutionRisk={prefetchedResolutionRisk}
              hideHeaderIcon={hideHeaderIcons}
              isGroupView={isGroupView}
              scopeId={scopeId}
            />
            <EuiHorizontalRule />
          </>
        )}
      {isNewEntityAnalyticsPage && resolutionSection}
      {entityStoreEntityId && (
        <>
          <VisualizationsSection
            entityId={entityStoreEntityId}
            isPreviewMode={isPreviewMode}
            scopeId={scopeId}
            openDetailsPanel={openDetailsPanel}
            hideHeaderIcons={hideHeaderIcons}
          />
          <EuiHorizontalRule margin="m" />
        </>
      )}
      {!isNewEntityAnalyticsPage && resolutionSection}
      {!entityStoreV2Enabled && (
        <AssetCriticalityAccordion
          entity={{ name: serviceName, type: EntityType.service }}
          onChange={onAssetCriticalityChange}
        />
      )}
      <EntityInsight
        entityRecord={entityRecord}
        aliasRecords={aliasRecords}
        identityFields={identityFields}
        isPreviewMode={isPreviewMode}
        openDetailsPanel={openDetailsPanel}
        entityType={EntityType.service}
        hideHeaderIcons={hideHeaderIcons}
        scopeId={scopeId}
      />
      <ObservedDataSection
        entityType={EntityType.service}
        observedData={observedService}
        contextID={contextID}
        identityFields={identityFields}
        entityRecord={entityRecord}
        scopeId={scopeId}
        queryId={SERVICE_PANEL_OBSERVED_SERVICE_QUERY_ID}
        hideAnomalies
      />
    </>
  );
};
