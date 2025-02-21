/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';

import React from 'react';
import type { UserItem } from '../../../../common/search_strategy';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { AssetCriticalityAccordion } from '../../../entity_analytics/components/asset_criticality/asset_criticality_selector';

import { OBSERVED_USER_QUERY_ID } from '../../../explore/users/containers/users/observed_details';
import { FlyoutRiskSummary } from '../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import { ManagedUser } from './components/managed_user';
import type { ManagedUserData } from './types';
import { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';
import { USER_PANEL_RISK_SCORE_QUERY_ID } from '.';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { ObservedEntity } from '../shared/components/observed_entity';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';
import { useObservedUserItems } from './hooks/use_observed_user_items';
import type { EntityDetailsPath } from '../shared/components/left_panel/left_panel_header';
import { EntityInsight } from '../../../cloud_security_posture/components/entity_insight';

interface UserPanelContentProps {
  userName: string;
  observedUser: ObservedEntityData<UserItem>;
  managedUser: ManagedUserData;
  riskScoreState: RiskScoreState<EntityType.user>;
  recalculatingScore: boolean;
  contextID: string;
  scopeId: string;
  onAssetCriticalityChange: () => void;
  openDetailsPanel: (path: EntityDetailsPath) => void;
  isPreviewMode?: boolean;
  isLinkEnabled: boolean;
}

export const UserPanelContent = ({
  userName,
  observedUser,
  managedUser,
  riskScoreState,
  recalculatingScore,
  contextID,
  scopeId,
  openDetailsPanel,
  onAssetCriticalityChange,
  isPreviewMode,
  isLinkEnabled,
}: UserPanelContentProps) => {
  const observedFields = useObservedUserItems(observedUser);
  const isManagedUserEnable = useIsExperimentalFeatureEnabled('newUserDetailsFlyoutManagedUser');

  return (
    <FlyoutBody>
      {riskScoreState.hasEngineBeenInstalled && riskScoreState.data?.length !== 0 && (
        <>
          <FlyoutRiskSummary
            riskScoreData={riskScoreState}
            recalculatingScore={recalculatingScore}
            queryId={USER_PANEL_RISK_SCORE_QUERY_ID}
            openDetailsPanel={openDetailsPanel}
            isPreviewMode={isPreviewMode}
            isLinkEnabled={isLinkEnabled}
            entityType={EntityType.user}
          />
          <EuiHorizontalRule />
        </>
      )}
      <AssetCriticalityAccordion
        entity={{ name: userName, type: EntityType.user }}
        onChange={onAssetCriticalityChange}
      />
      <EntityInsight
        value={userName}
        field={EntityIdentifierFields.userName}
        isPreviewMode={isPreviewMode}
        isLinkEnabled={isLinkEnabled}
        openDetailsPanel={openDetailsPanel}
      />
      <ObservedEntity
        observedData={observedUser}
        contextID={contextID}
        scopeId={scopeId}
        observedFields={observedFields}
        queryId={OBSERVED_USER_QUERY_ID}
      />
      <EuiHorizontalRule margin="m" />
      {isManagedUserEnable && (
        <ManagedUser
          managedUser={managedUser}
          contextID={contextID}
          openDetailsPanel={openDetailsPanel}
          isPreviewMode={isPreviewMode}
          isLinkEnabled={isLinkEnabled}
        />
      )}
    </FlyoutBody>
  );
};
