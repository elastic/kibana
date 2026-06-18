/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import type { Entity } from '../../../../../common/api/entity_analytics';
import { ObservedDataSection } from './components/observed_data_section';
import { useHasEntityResolutionLicense } from '../../../../common/hooks/use_has_entity_resolution_license';
import { EntityHighlightsAccordion } from '../../../../entity_analytics/components/entity_details_flyout/components/entity_highlights';
import { EntityInsight } from '../../../../cloud_security_posture/components/flyout_v2/entity_insight';
import { AssetCriticalityAccordion } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { FlyoutRiskSummary } from '../../../../entity_analytics/components/flyout_v2/risk_summary';
import type { RiskScoreState } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { EntityIdentifierFields, EntityType } from '../../../../../common/entity_analytics/types';
import { HOST_PANEL_OBSERVED_HOST_QUERY_ID, HOST_PANEL_RISK_SCORE_QUERY_ID } from './constants';
import type { EntityDetailsPath } from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import type { IdentityFields } from '../../../../flyout/document_details/shared/utils';
import type { ObservedEntityData } from '../../../../flyout/entity_details/shared/components/observed_entity/types';
import type { EntityRiskScore, HostItem } from '../../../../../common/search_strategy';
import { VisualizationsSection } from '../../../../flyout/entity_details/shared/components/right/visualizations_section';
import { ResolutionSection } from '../../../../entity_analytics/components/entity_resolution/resolution_section';

type ObservedHostData = Omit<ObservedEntityData<HostItem>, 'anomalies'>;

export interface ContentProps {
  /** Observed host data (anomalies excluded). */
  observedHost: ObservedHostData;
  /** Current risk score state for the host. */
  riskScoreState: RiskScoreState<EntityType.host>;
  /** Unique context ID passed to child queries. */
  contextID: string;
  /** Scope ID for the timeline or table that opened this flyout. */
  scopeId: string;
  /** Callback to navigate to a detail panel (e.g. risk inputs, asset criticality). */
  openDetailsPanel: (path: EntityDetailsPath) => void;
  /** Key-value map of identity fields used to resolve the host. */
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
  /** Entity store entity ID for the host. */
  entityStoreEntityId?: string;
  /** See {@link RiskSummaryProps.prefetchedResolutionRisk}. */
  prefetchedResolutionRisk?: EntityRiskScore<EntityType.host>;
}

/**
 * Host details flyout content section.
 */
export const Content = ({
  identityFields,
  observedHost,
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
}: ContentProps) => {
  const hasEntityResolutionLicense = useHasEntityResolutionLicense();

  // Extract hostName from identityFields for components that need a string
  // Priority: identityFields['host.name'] > identityFields[first key]
  const hostName =
    identityFields[EntityIdentifierFields.hostName] || Object.values(identityFields)[0] || '';

  return (
    <>
      {!skipRiskAndCriticality && (
        <EntityHighlightsAccordion
          entityIdentifier={entityRecord ? entityRecord.entity.id : hostName}
          entityType={EntityType.host}
        />
      )}
      {!skipRiskAndCriticality &&
        riskScoreState.hasEngineBeenInstalled &&
        (riskScoreState.loading || (riskScoreState.data?.length ?? 0) > 0) && (
          <>
            <FlyoutRiskSummary
              entityType={EntityType.host}
              riskScoreData={riskScoreState}
              recalculatingScore={recalculatingScore}
              queryId={HOST_PANEL_RISK_SCORE_QUERY_ID}
              openDetailsPanel={openDetailsPanel}
              entityId={entityRecord?.entity.id}
              prefetchedResolutionRisk={prefetchedResolutionRisk}
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
            entityType={EntityType.host}
            scopeId={scopeId}
            openDetailsPanel={openDetailsPanel}
          />
          <EuiHorizontalRule />
        </>
      )}
      {!skipRiskAndCriticality && !entityRecord && (
        <AssetCriticalityAccordion
          entity={{ name: hostName, type: EntityType.host }}
          onChange={onAssetCriticalityChange}
        />
      )}
      <EntityInsight
        entityRecord={entityRecord}
        identityFields={identityFields}
        openDetailsPanel={openDetailsPanel}
        entityType={EntityType.host}
      />
      <ObservedDataSection
        observedHost={observedHost}
        contextID={contextID}
        identityFields={identityFields}
        entityRecord={entityRecord}
        scopeId={scopeId}
        queryId={HOST_PANEL_OBSERVED_HOST_QUERY_ID}
      />
    </>
  );
};
