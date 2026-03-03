/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { ObservedDataSection } from './components/observed_data_section';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { EntityHighlightsAccordion } from '../../../entity_analytics/components/entity_details_flyout/components/entity_highlights';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { EntityInsight } from '../../../cloud_security_posture/components/entity_insight';
import { AssetCriticalityAccordion } from '../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { FlyoutRiskSummary } from '../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';
import { HOST_PANEL_OBSERVED_HOST_QUERY_ID, HOST_PANEL_RISK_SCORE_QUERY_ID } from '.';
import type { EntityDetailsPath } from '../shared/components/left_panel/left_panel_header';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';
import type { HostItem } from '../../../../common/search_strategy';

type ObservedHostData = Omit<ObservedEntityData<HostItem>, 'anomalies'>;

interface HostPanelContentProps {
  hostName: string;
  observedHost: ObservedHostData;
  riskScoreState: RiskScoreState<EntityType.host>;
  contextID: string;
  scopeId: string;
  openDetailsPanel: (path: EntityDetailsPath) => void;
  onAssetCriticalityChange: () => void;
  recalculatingScore: boolean;
  isPreviewMode: boolean;
}

export const HostPanelContent = ({
  hostName,
  observedHost,
  riskScoreState,
  recalculatingScore,
  contextID,
  scopeId,
  openDetailsPanel,
  onAssetCriticalityChange,
  isPreviewMode,
}: HostPanelContentProps) => {
  const isEntityDetailsHighlightsAIEnabled = useIsExperimentalFeatureEnabled(
    'entityDetailsHighlightsEnabled'
  );

  return (
    <FlyoutBody>
      {isEntityDetailsHighlightsAIEnabled && (
        <EntityHighlightsAccordion entityIdentifier={hostName} entityType={EntityType.host} />
      )}
      {riskScoreState.hasEngineBeenInstalled && riskScoreState.data?.length !== 0 && (
        <>
          <FlyoutRiskSummary
            entityType={EntityType.host}
            riskScoreData={riskScoreState}
            recalculatingScore={recalculatingScore}
            queryId={HOST_PANEL_RISK_SCORE_QUERY_ID}
            openDetailsPanel={openDetailsPanel}
            isPreviewMode={isPreviewMode}
          />
          <EuiHorizontalRule />
        </>
      )}
      <AssetCriticalityAccordion
        entity={{ name: hostName, type: EntityType.host }}
        onChange={onAssetCriticalityChange}
      />
      <EntityInsight
        value={hostName}
        field={EntityIdentifierFields.hostName}
        isPreviewMode={isPreviewMode}
        openDetailsPanel={openDetailsPanel}
      />
      <ObservedDataSection
        hostName={hostName}
        observedHost={observedHost}
        contextID={contextID}
        scopeId={scopeId}
        queryId={HOST_PANEL_OBSERVED_HOST_QUERY_ID}
      />
    </FlyoutBody>
  );
};
