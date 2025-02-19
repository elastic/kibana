/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';

import React from 'react';
import type { ServiceItem } from '../../../../common/search_strategy';
import { AssetCriticalityAccordion } from '../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { FlyoutRiskSummary } from '../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import { EntityType } from '../../../../common/entity_analytics/types';
import { SERVICE_PANEL_RISK_SCORE_QUERY_ID } from '.';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { ObservedEntity } from '../shared/components/observed_entity';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';
import { useObservedServiceItems } from './hooks/use_observed_service_items';
import type { EntityDetailsPath } from '../shared/components/left_panel/left_panel_header';

export const OBSERVED_SERVICE_QUERY_ID = 'observedServiceDetailsQuery';

interface ServicePanelContentProps {
  serviceName: string;
  observedService: ObservedEntityData<ServiceItem>;
  riskScoreState: RiskScoreState<EntityType.service>;
  recalculatingScore: boolean;
  contextID: string;
  scopeId: string;
  onAssetCriticalityChange: () => void;
  openDetailsPanel: (path: EntityDetailsPath) => void;
  isPreviewMode?: boolean;
  isLinkEnabled: boolean;
}

export const ServicePanelContent = ({
  serviceName,
  observedService,
  riskScoreState,
  recalculatingScore,
  contextID,
  scopeId,
  openDetailsPanel,
  onAssetCriticalityChange,
  isPreviewMode,
  isLinkEnabled,
}: ServicePanelContentProps) => {
  const observedFields = useObservedServiceItems(observedService);

  return (
    <FlyoutBody>
      {riskScoreState.hasEngineBeenInstalled && riskScoreState.data?.length !== 0 && (
        <>
          <FlyoutRiskSummary
            riskScoreData={riskScoreState}
            recalculatingScore={recalculatingScore}
            queryId={SERVICE_PANEL_RISK_SCORE_QUERY_ID}
            openDetailsPanel={openDetailsPanel}
            isPreviewMode={isPreviewMode}
            isLinkEnabled={isLinkEnabled}
            entityType={EntityType.service}
          />
          <EuiHorizontalRule />
        </>
      )}
      <AssetCriticalityAccordion
        entity={{ name: serviceName, type: EntityType.service }}
        onChange={onAssetCriticalityChange}
      />
      <ObservedEntity
        observedData={observedService}
        contextID={contextID}
        scopeId={scopeId}
        observedFields={observedFields}
        queryId={OBSERVED_SERVICE_QUERY_ID}
      />
      <EuiHorizontalRule margin="m" />
    </FlyoutBody>
  );
};
