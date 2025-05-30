/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
} from '@elastic/eui';
import { useEntityAnalyticsTypes } from '../../../hooks/use_enabled_entity_types';
import { RiskEngineStatusEnum } from '../../../../../common/api/entity_analytics';
import { EntitiesList } from '../entities_list';
import { useEntityStoreStatus } from '../hooks/use_entity_store';
import { EntityAnalyticsRiskScores } from '../../entity_analytics_risk_score';
import { useRiskEngineStatus } from '../../../api/hooks/use_risk_engine_status';

import { EnablementPanel } from './dashboard_enablement_panel';
import { EntityStoreErrorCallout } from './entity_store_error_callout';

const EntityStoreDashboardPanelsComponent = () => {
  const riskEngineStatus = useRiskEngineStatus();
  const storeStatusQuery = useEntityStoreStatus({});
  const entityTypes = useEntityAnalyticsTypes();

  const callouts = (storeStatusQuery.data?.engines ?? [])
    .filter((engine) => engine.status === 'error')
    .map((engine) => <EntityStoreErrorCallout engine={engine} />);

  if (storeStatusQuery.status === 'loading') {
    return (
      <EuiPanel hasBorder>
        <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />
      </EuiPanel>
    );
  }

  return (
    <EuiFlexGroup direction="column" data-test-subj="entityStorePanelsGroup">
      {storeStatusQuery.status === 'error' ? (
        callouts
      ) : (
        <EnablementPanel
          state={{
            riskEngine: riskEngineStatus,
            entityStore: storeStatusQuery,
          }}
        />
      )}

      {riskEngineStatus.data?.risk_engine_status !== RiskEngineStatusEnum.NOT_INSTALLED && (
        <>
          {entityTypes.map((entityType) => (
            <EuiFlexItem key={entityType}>
              <EntityAnalyticsRiskScores riskEntity={entityType} />
            </EuiFlexItem>
          ))}
        </>
      )}
      {storeStatusQuery.data?.status !== 'not_installed' &&
        storeStatusQuery.data?.status !== 'installing' && (
          <EuiFlexItem data-test-subj="entitiesListPanel">
            <EntitiesList />
          </EuiFlexItem>
        )}
    </EuiFlexGroup>
  );
};

export const EntityStoreDashboardPanels = React.memo(EntityStoreDashboardPanelsComponent);
EntityStoreDashboardPanels.displayName = 'EntityStoreDashboardPanels';
