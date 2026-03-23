/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTitle,
  useIsWithinBreakpoints,
} from '@elastic/eui';
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
import { useSpaceId } from '../../common/hooks/use_space_id';
import { CombinedRiskDonutChart } from '../components/home/combined_risk_donut_chart';
import { EntityAnalyticsRecentAnomalies } from '../components/home/anomalies_placeholder_panel';
import { WatchlistFilter } from '../components/watchlists/watchlist_filter';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import {
  ENTITY_ANALYTICS_LOCAL_STORAGE_COLUMNS_KEY,
  ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
} from '../components/home/constants';
import {
  EntitiesTableSection,
  DataViewContext,
  useEntityURLState,
  type EntitiesBaseURLQuery,
  type URLQuery,
} from '../components/home/entities_table';

const getDefaultQuery = ({ query, filters }: EntitiesBaseURLQuery): URLQuery => ({
  query,
  filters,
  pageFilters: [],
  sort: [['@timestamp', 'desc']],
});

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

  const isXlScreen = useIsWithinBreakpoints(['l', 'xl']);
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
            <EuiFlexItem>
              <EuiFlexGroup
                direction={isXlScreen ? 'row' : 'column'}
                responsive={false}
                gutterSize="l"
              >
                <EuiFlexItem grow={2}>
                  <EuiPanel hasBorder>
                    <CombinedRiskDonutChart />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <EuiPanel hasBorder>
                    <EntityAnalyticsRecentAnomalies />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiPanel hasBorder>
              <EntityAnalyticsEntitiesTable />
            </EuiPanel>
          </EuiFlexGroup>
        )}
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};

const EntityAnalyticsEntitiesTable = () => {
  const spaceId = useSpaceId();
  const { dataView: entityDataView, isLoading: entityDataViewLoading } =
    useEntityStoreDataView(spaceId);

  if (entityDataViewLoading || !entityDataView) {
    return <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsEntitiesTableLoader" />;
  }

  const dataViewContextValue = {
    dataView: entityDataView,
    dataViewIsLoading: entityDataViewLoading,
  };

  return (
    <DataViewContext.Provider value={dataViewContextValue}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.homePage.entitiesTableTitle"
              defaultMessage="Entities"
            />
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EntityAnalyticsEntitiesTableContent />
    </DataViewContext.Provider>
  );
};

const EntityAnalyticsEntitiesTableContent = () => {
  const state = useEntityURLState({
    paginationLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_PAGE_SIZE_KEY,
    columnsLocalStorageKey: ENTITY_ANALYTICS_LOCAL_STORAGE_COLUMNS_KEY,
    defaultQuery: getDefaultQuery,
  });

  return <EntitiesTableSection state={state} />;
};
