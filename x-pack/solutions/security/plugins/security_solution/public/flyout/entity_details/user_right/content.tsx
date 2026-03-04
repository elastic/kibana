/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import React from 'react';
import type { Entity } from '../../../../common/api/entity_analytics';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import { ObservedDataSection } from './components/observed_data_section';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { EntityHighlightsAccordion } from '../../../entity_analytics/components/entity_details_flyout/components/entity_highlights';
import { AssetCriticalityAccordion } from '../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { OBSERVED_USER_QUERY_ID } from '../../../explore/users/containers/users/observed_details';
import { FlyoutRiskSummary } from '../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';
import { USER_PANEL_RISK_SCORE_QUERY_ID } from '.';
import { FlyoutBody } from '../../shared/components/flyout_body';
import type { EntityDetailsPath } from '../shared/components/left_panel/left_panel_header';
import { EntityInsight } from '../../../cloud_security_posture/components/entity_insight';
import type { EntityIdentifiers } from '../../document_details/shared/utils';
import type { UserItem } from '../../../../common/search_strategy';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';

export type ObservedUserData = Omit<ObservedEntityData<UserItem>, 'anomalies'>;

interface UserPanelContentProps {
  entityIdentifiers: EntityIdentifiers;
  observedUser: ObservedUserData;
  riskScoreState: RiskScoreState<EntityType.user>;
  recalculatingScore: boolean;
  contextID: string;
  scopeId: string;
  onAssetCriticalityChange: () => void;
  openDetailsPanel: (path: EntityDetailsPath) => void;
  isPreviewMode: boolean;
  entityRecord?: Entity;
  criticalityFromEntityStore?: CriticalityLevelWithUnassigned;
  onSaveAssetCriticalityViaEntityStore?: (updatedRecord: Entity) => Promise<void>;
}

export const UserPanelContent = ({
  entityIdentifiers,
  observedUser,
  riskScoreState,
  recalculatingScore,
  contextID,
  scopeId,
  openDetailsPanel,
  onAssetCriticalityChange,
  isPreviewMode,
  entityRecord,
  criticalityFromEntityStore,
  onSaveAssetCriticalityViaEntityStore,
}: UserPanelContentProps) => {
  const isEntityDetailsHighlightsAIEnabled = useIsExperimentalFeatureEnabled(
    'entityDetailsHighlightsEnabled'
  );

  // Extract userName from entityIdentifiers for components that need a string
  // Priority: entityIdentifiers['user.name'] > entityIdentifiers[first key]
  const userName =
    entityIdentifiers[EntityIdentifierFields.userName] || Object.values(entityIdentifiers)[0] || '';

  return (
    <FlyoutBody>
      {isEntityDetailsHighlightsAIEnabled && (
        <EntityHighlightsAccordion entityIdentifier={userName} entityType={EntityType.user} />
      )}
      {riskScoreState.hasEngineBeenInstalled && riskScoreState.data?.length !== 0 && (
        <>
          <FlyoutRiskSummary
            riskScoreData={riskScoreState}
            recalculatingScore={recalculatingScore}
            queryId={USER_PANEL_RISK_SCORE_QUERY_ID}
            openDetailsPanel={openDetailsPanel}
            isPreviewMode={isPreviewMode}
            entityType={EntityType.user}
          />
          <EuiHorizontalRule />
        </>
      )}
      <AssetCriticalityAccordion
        entity={{ identifiers: entityIdentifiers, name: userName, type: EntityType.user }}
        onChange={onAssetCriticalityChange}
        entityRecord={entityRecord}
        criticalityFromEntityStore={criticalityFromEntityStore}
        onSaveViaEntityStore={onSaveAssetCriticalityViaEntityStore}
      />
      <EntityInsight
        entityIdentifiers={entityIdentifiers}
        isPreviewMode={isPreviewMode}
        openDetailsPanel={openDetailsPanel}
      />
      <ObservedDataSection
        entityIdentifiers={entityIdentifiers}
        userName={userName}
        observedUser={observedUser}
        contextID={contextID}
        scopeId={scopeId}
        queryId={OBSERVED_USER_QUERY_ID}
      />
      <EuiHorizontalRule margin="m" />
    </FlyoutBody>
  );
};
