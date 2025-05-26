/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';

import { AssetInventorySearchBar } from '../components/asset_inventory_search_bar';
import { AssetInventoryFilters } from '../components/filters/asset_inventory_filters';
import { AssetInventoryBarChart } from '../components/asset_inventory_bar_chart';
import { AssetInventoryTableSection } from '../components/asset_inventory_table_section';
import { AssetInventoryTitle } from '../components/asset_inventory_title';
import { useFetchChartData } from '../hooks/use_fetch_chart_data/use_fetch_chart_data';
import {
  useAssetInventoryURLState,
  type AssetsBaseURLQuery,
  type URLQuery,
} from '../hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useDataView } from '../hooks/use_data_view';
import { DataViewContext } from '../hooks/data_view_context';

import {
  ASSET_INVENTORY_DATA_VIEW_ID_PREFIX,
  LOCAL_STORAGE_COLUMNS_KEY,
  LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
} from '../constants';
import { OnboardingSuccessCallout } from '../components/onboarding/onboarding_success_callout';

const getDefaultQuery = ({ query, filters, pageFilters }: AssetsBaseURLQuery): URLQuery => ({
  query,
  filters,
  pageFilters,
  sort: [['@timestamp', 'desc']],
});

export const AllAssets = () => {
  const spaceId = useSpaceId();

  const dataViewQuery = useDataView(
    spaceId ? `${ASSET_INVENTORY_DATA_VIEW_ID_PREFIX}-${spaceId}` : undefined
  );

  if (!dataViewQuery.data) {
    return null;
  }
  const dataViewContextValue = {
    dataView: dataViewQuery.data,
    dataViewRefetch: dataViewQuery.refetch,
    dataViewIsLoading: dataViewQuery.isLoading,
    dataViewIsRefetching: dataViewQuery.isRefetching,
  };

  return (
    <DataViewContext.Provider value={dataViewContextValue}>
      <AllAssetsComponent />
    </DataViewContext.Provider>
  );
};

const AllAssetsComponent = () => {
  const state = useAssetInventoryURLState({
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey: LOCAL_STORAGE_COLUMNS_KEY,
    defaultQuery: getDefaultQuery,
  });

  const { sort, query, queryError, urlQuery, setUrlQuery } = state;

  const {
    data: chartData,
    isFetching: isFetchingChartData,
    isLoading: isLoadingChartData,
  } = useFetchChartData({
    query,
    sort,
    enabled: !queryError,
  });

  return (
    <I18nProvider>
      <AssetInventorySearchBar query={urlQuery} setQuery={setUrlQuery} />
      <EuiPageTemplate.Section>
        <AssetInventoryTitle />
        <EuiSpacer size="l" />
        <OnboardingSuccessCallout />
        <AssetInventoryFilters setQuery={setUrlQuery} />
        <EuiSpacer size="l" />
        <AssetInventoryBarChart
          isLoading={isLoadingChartData}
          isFetching={isFetchingChartData}
          assetInventoryChartData={!!chartData && chartData.length > 0 ? chartData : []}
        />
        <EuiSpacer size="xl" />
        <AssetInventoryTableSection state={state} />
      </EuiPageTemplate.Section>
    </I18nProvider>
  );
};
