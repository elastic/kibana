/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { EntityInsight } from '../../../cloud_security_posture/components/entity_insight';
import { AssetCriticalityAccordion } from '../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { FlyoutRiskSummary } from '../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';
import type { HostItem } from '../../../../common/search_strategy';
import { ObservedEntity } from '../shared/components/observed_entity';
import { HOST_PANEL_OBSERVED_HOST_QUERY_ID, HOST_PANEL_RISK_SCORE_QUERY_ID } from '.';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';
import { useObservedHostFields } from './hooks/use_observed_host_fields';
import type { EntityDetailsPath } from '../shared/components/left_panel/left_panel_header';

interface HostPanelContentProps {
  observedHost: ObservedEntityData<HostItem>;
  riskScoreState: RiskScoreState<EntityType.host>;
  contextID: string;
  scopeId: string;
  openDetailsPanel: (path: EntityDetailsPath) => void;
  hostName: string;
  onAssetCriticalityChange: () => void;
  recalculatingScore: boolean;
  isPreviewMode?: boolean;
  isLinkEnabled: boolean;
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
  isLinkEnabled,
}: HostPanelContentProps) => {
  const observedFields = useObservedHostFields(observedHost);

  return (
    <FlyoutBody>
      {riskScoreState.hasEngineBeenInstalled && riskScoreState.data?.length !== 0 && (
        <>
          <FlyoutRiskSummary
            entityType={EntityType.host}
            riskScoreData={riskScoreState}
            recalculatingScore={recalculatingScore}
            queryId={HOST_PANEL_RISK_SCORE_QUERY_ID}
            openDetailsPanel={openDetailsPanel}
            isPreviewMode={isPreviewMode}
            isLinkEnabled={isLinkEnabled}
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
        isLinkEnabled={isLinkEnabled}
      />
      <ObservedEntity
        observedData={observedHost}
        contextID={contextID}
        scopeId={scopeId}
        observedFields={observedFields}
        queryId={HOST_PANEL_OBSERVED_HOST_QUERY_ID}
      />
    </FlyoutBody>
  );
};
