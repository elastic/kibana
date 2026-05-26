/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import type { Entity } from '../../../../../common/api/entity_analytics';
import { ObservedDataSection } from '../../shared/components/observed_data_section';
import { useHasEntityResolutionLicense } from '../../../../common/hooks/use_has_entity_resolution_license';
import { EntityHighlightsAccordion } from '../../../../entity_analytics/components/entity_details_flyout/components/entity_highlights';
import { EntityInsight } from '../../../../cloud_security_posture/components/entity_insight';
import { AssetCriticalityAccordion } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { FlyoutRiskSummary } from '../../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { EntityIdentifierFields, EntityType } from '../../../../../common/entity_analytics/types';
import { USER_PANEL_OBSERVED_USER_QUERY_ID, USER_PANEL_RISK_SCORE_QUERY_ID } from './constants';
import type { EntityDetailsPath } from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import type { IdentityFields } from '../../../../flyout/document_details/shared/utils';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import type { EntityRiskScore, UserItem } from '../../../../../common/search_strategy';
import { VisualizationsSection } from '../../../../flyout/entity_details/shared/components/right/visualizations_section';
import { ResolutionSection } from '../../../../entity_analytics/components/entity_resolution/resolution_section';
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
  /** When true (e.g. entity store v2 enabled but no entity found), hide risk score and asset criticality. */
  skipRiskAndCriticality?: boolean;
  /** Entity store entity ID for the user. */
  entityStoreEntityId?: string;
  /** See {@link RiskSummaryProps.prefetchedResolutionRisk}. */
  prefetchedResolutionRisk?: EntityRiskScore<EntityType.user>;
  /** When true, hides the chevron icons in the risk summary and alerts section headers. Used by the v2 flyout. */
  hideHeaderIcons?: boolean;
}

/**
 * User details flyout content section.
 */
export const Content = ({
  identityFields,
  observedUser,
  riskScoreState,
  recalculatingScore,
  contextID,
  scopeId,
  openDetailsPanel,
  onAssetCriticalityChange,
  isPreviewMode,
  entityRecord,
  skipRiskAndCriticality = false,
  entityStoreEntityId,
  prefetchedResolutionRisk,
  hideHeaderIcons = false,
}: ContentProps) => {
  const hasEntityResolutionLicense = useHasEntityResolutionLicense();

  const userName =
    identityFields[EntityIdentifierFields.userName] || Object.values(identityFields)[0] || '';

  return (
    <>
      {!skipRiskAndCriticality && (
        <EntityHighlightsAccordion
          entityIdentifier={entityRecord ? entityRecord.entity.id : userName}
          entityType={EntityType.user}
        />
      )}
      {!skipRiskAndCriticality &&
        riskScoreState.hasEngineBeenInstalled &&
        (riskScoreState.loading || (riskScoreState.data?.length ?? 0) > 0) && (
          <>
            <FlyoutRiskSummary
              entityType={EntityType.user}
              riskScoreData={riskScoreState}
              recalculatingScore={recalculatingScore}
              queryId={USER_PANEL_RISK_SCORE_QUERY_ID}
              openDetailsPanel={openDetailsPanel}
              isPreviewMode={isPreviewMode}
              entityId={entityRecord?.entity.id}
              prefetchedResolutionRisk={prefetchedResolutionRisk}
              hideHeaderIcon={hideHeaderIcons}
            />
            <EuiHorizontalRule />
          </>
        )}
      {entityStoreEntityId && (
        <>
          <VisualizationsSection
            entityId={entityStoreEntityId}
            isPreviewMode={isPreviewMode}
            scopeId={scopeId}
            openDetailsPanel={openDetailsPanel}
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
            openDetailsPanel={openDetailsPanel}
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
