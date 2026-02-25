/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { PageLoader } from '../../common/components/page_loader';
import { PageScope } from '../../data_view_manager/constants';
import { CombinedRiskDonutChart } from '../components/home/combined_risk_donut_chart';
import { AnomaliesPlaceholderPanel } from '../components/home/anomalies_placeholder_panel';
import { EntitiesTable } from '../components/home/entities_table';
import { WatchlistFilter } from '../components/watchlists/watchlist_filter';

export const EntityAnalyticsHomePage = () => {
  const {
    indicesExist: oldIndicesExist,
    loading: oldIsSourcererLoading,
    sourcererDataView: oldSourcererDataViewSpec,
  } = useSourcererDataView();
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataView, status } = useDataView(PageScope.explore);

  const isSourcererLoading = useMemo(
    () => (newDataViewPickerEnabled ? status !== 'ready' : oldIsSourcererLoading),
    [newDataViewPickerEnabled, oldIsSourcererLoading, status]
  );

  const indicesExist = useMemo(
    () => (newDataViewPickerEnabled ? !!dataView?.matchedIndices?.length : oldIndicesExist),
    [dataView?.matchedIndices?.length, newDataViewPickerEnabled, oldIndicesExist]
  );

  const showEmptyPrompt = !indicesExist;

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  if (showEmptyPrompt) {
    return <EmptyPrompt />;
  }

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar
          dataView={dataView}
          id={InputsModelId.global}
          sourcererDataViewSpec={oldSourcererDataViewSpec}
        />
      </FiltersGlobal>

      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsHomePage">
        <HeaderPage
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.homePage.pageTitle"
              defaultMessage="Entity Analytics"
            />
          }
          rightSideItems={[<WatchlistFilter />]}
        />

        {isSourcererLoading ? (
          <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsHomePageLoader" />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="l">
            {/* Donut Chart and Anomalies Panel Row */}
            <EuiFlexItem>
              <EuiPanel hasBorder>
                <EuiFlexGroup responsive={false} gutterSize="l">
                  <EuiFlexItem grow={1}>
                    <CombinedRiskDonutChart />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1}>
                    <AnomaliesPlaceholderPanel />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>

            {/* Entities Table */}
            <EuiFlexItem>
              <EntitiesTable />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};
