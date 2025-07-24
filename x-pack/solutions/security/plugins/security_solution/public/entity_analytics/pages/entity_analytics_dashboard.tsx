/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { ENTITY_ANALYTICS } from '../../app/translations';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../sourcerer/containers';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { RiskScoreUpdatePanel } from '../components/risk_score_update_panel';
import { useHasSecurityCapability } from '../../helper_hooks';
import { EntityAnalyticsHeader } from '../components/entity_analytics_header';
import { EntityAnalyticsAnomalies } from '../components/entity_analytics_anomalies';

import { EntityStoreDashboardPanels } from '../components/entity_store/components/dashboard_entity_store_panels';
import { EntityAnalyticsRiskScores } from '../components/entity_analytics_risk_score';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useStoreEntityTypes } from '../hooks/use_enabled_entity_types';
import { PageLoader } from '../../common/components/page_loader';

const EntityAnalyticsComponent = () => {
  const { data: riskScoreEngineStatus } = useRiskEngineStatus();
  const {
    indicesExist: oldIndicesExist,
    loading: oldIsSourcererLoading,
    sourcererDataView: oldSourcererDataViewSpec,
  } = useSourcererDataView();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const { dataView, status } = useDataView();

  const indicesExist = useMemo(
    () => (newDataViewPickerEnabled ? !!dataView?.matchedIndices?.length : oldIndicesExist),
    [dataView?.matchedIndices?.length, newDataViewPickerEnabled, oldIndicesExist]
  );
  const isSourcererLoading = useMemo(
    () => (newDataViewPickerEnabled ? status !== 'ready' : oldIsSourcererLoading),
    [newDataViewPickerEnabled, oldIsSourcererLoading, status]
  );

  const isRiskScoreModuleLicenseAvailable = useHasSecurityCapability('entity-analytics');
  const isEntityStoreFeatureFlagDisabled = useIsExperimentalFeatureEnabled('entityStoreDisabled');
  const entityTypes = useStoreEntityTypes();

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <>
      {indicesExist ? (
        <>
          <FiltersGlobal>
            <SiemSearchBar
              id={InputsModelId.global}
              sourcererDataView={oldSourcererDataViewSpec} // TODO: newDataViewPicker - Can be removed after migration to new dataview picker
            />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
            <HeaderPage title={ENTITY_ANALYTICS} />

            {isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsLoader" />
            ) : (
              <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
                {riskScoreEngineStatus?.isUpdateAvailable && isRiskScoreModuleLicenseAvailable && (
                  <EuiFlexItem>
                    <RiskScoreUpdatePanel />
                  </EuiFlexItem>
                )}

                <EuiFlexItem>
                  <EntityAnalyticsHeader />
                </EuiFlexItem>

                {!isEntityStoreFeatureFlagDisabled ? (
                  <EuiFlexItem>
                    <EntityStoreDashboardPanels />
                  </EuiFlexItem>
                ) : (
                  <>
                    {entityTypes.map((entityType) => (
                      <EuiFlexItem key={entityType}>
                        <EntityAnalyticsRiskScores riskEntity={entityType} />
                      </EuiFlexItem>
                    ))}
                  </>
                )}

                <EuiFlexItem>
                  <EntityAnalyticsAnomalies />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.entityAnalytics} />
    </>
  );
};

export const EntityAnalyticsPage = React.memo(EntityAnalyticsComponent);
