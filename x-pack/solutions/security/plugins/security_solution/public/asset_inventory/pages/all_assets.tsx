/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiPageTemplate } from '@elastic/eui';

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

import { LOCAL_STORAGE_COLUMNS_KEY, LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY } from '../constants';
import { OnboardingSuccessCallout } from '../components/onboarding/onboarding_success_callout';

const getDefaultQuery = ({ query, filters }: AssetsBaseURLQuery): URLQuery => ({
  query,
  filters,
  sort: [['@timestamp', 'desc']],
});

export const AllAssets = () => {
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
        <OnboardingSuccessCallout />
        <AssetInventoryFilters setQuery={setUrlQuery} />
        <AssetInventoryBarChart
          isLoading={isLoadingChartData}
          isFetching={isFetchingChartData}
          assetInventoryChartData={!!chartData && chartData.length > 0 ? chartData : []}
        />
        <AssetInventoryTableSection state={state} />
      </EuiPageTemplate.Section>
    </I18nProvider>
  );
};
