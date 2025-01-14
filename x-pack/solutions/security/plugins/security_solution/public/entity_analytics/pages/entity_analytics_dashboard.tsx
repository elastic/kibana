/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
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
import { EntityAnalyticsHeader } from '../components/entity_analytics_header';
import { EntityAnalyticsAnomalies } from '../components/entity_analytics_anomalies';

import { EntityStoreDashboardPanels } from '../components/entity_store/components/dashboard_entity_store_panels';
import { EntityAnalyticsRiskScores } from '../components/entity_analytics_risk_score';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useStoreEntityTypes } from '../hooks/use_enabled_entity_types';

const EntityAnalyticsComponent = () => {
  const [skipEmptyPrompt, setSkipEmptyPrompt] = React.useState(false);
  const onSkip = React.useCallback(() => setSkipEmptyPrompt(true), [setSkipEmptyPrompt]);
  const { indicesExist, loading: isSourcererLoading, sourcererDataView } = useSourcererDataView();
  const isEntityStoreFeatureFlagDisabled = useIsExperimentalFeatureEnabled('entityStoreDisabled');
  const showEmptyPrompt = !indicesExist && !skipEmptyPrompt;
  const entityTypes = useStoreEntityTypes();

  return (
    <>
      {showEmptyPrompt ? (
        <EmptyPrompt onSkip={onSkip} />
      ) : (
        <>
          <FiltersGlobal>
            <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
            <HeaderPage title={ENTITY_ANALYTICS} />

            {isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsLoader" />
            ) : (
              <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
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
      )}

      <SpyRoute pageName={SecurityPageName.entityAnalytics} />
    </>
  );
};

export const EntityAnalyticsPage = React.memo(EntityAnalyticsComponent);
