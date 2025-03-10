/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';

import { AssetInventorySearchBar } from '../components/search_bar';
import { TechnicalPreviewBadge } from '../components/technical_preview_badge';
import { Filters } from '../components/filters/filters';
import { TopAssetsBarChart } from '../components/top_assets_bar_chart';
import { AssetInventoryTableSection } from '../components/asset_inventory_table_section';

import { useFetchChartData } from '../hooks/use_fetch_chart_data';
import {
  useAssetInventoryDataTable,
  type AssetsBaseURLQuery,
  type URLQuery,
} from '../hooks/use_asset_inventory_data_table';

import {
  LOCAL_STORAGE_COLUMNS_KEY,
  LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
  TEST_SUBJ_PAGE_TITLE,
} from '../constants';

const getDefaultQuery = ({ query, filters }: AssetsBaseURLQuery): URLQuery => ({
  query,
  filters,
  sort: [['@timestamp', 'desc']],
});

export const AllAssets = () => {
  const state = useAssetInventoryDataTable({
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey: LOCAL_STORAGE_COLUMNS_KEY,
    defaultQuery: getDefaultQuery,
  });

  const { sort, query, queryError, urlQuery, setUrlQuery } = state;

  const {
    data: chartData,
    // error: fetchChartDataError,
    isFetching: isFetchingChartData,
    isLoading: isLoadingChartData,
  } = useFetchChartData({
    query,
    sort,
    enabled: !queryError,
  });

  // if (error) {
  //   return (
  //     <>
  //       {error && <ErrorCallout error={error} />}
  //       {isEmptyResults && <EmptyState onResetFilters={onResetFilters} />}
  //     </>
  //   );
  //   return <div>{error.toString()}</div>;
  // }

  // if (isEmptyResults) {
  //   return <div>{'No data'}</div>;
  // }

  return (
    <I18nProvider>
      <AssetInventorySearchBar
        query={urlQuery}
        setQuery={setUrlQuery}
        // loading={loadingState === DataLoadingState.loading}
        loading={isLoadingChartData}
      />
      <EuiPageTemplate.Section>
        <EuiTitle size="l" data-test-subj={TEST_SUBJ_PAGE_TITLE}>
          <h1>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.allAssets.title"
              defaultMessage="All Assets"
            />
            <TechnicalPreviewBadge />
          </h1>
        </EuiTitle>
        <Filters setQuery={setUrlQuery} />
        <TopAssetsBarChart
          isLoading={isLoadingChartData}
          isFetching={isFetchingChartData}
          entities={!!chartData && chartData.length > 0 ? chartData : []}
        />
        <AssetInventoryTableSection state={state} />
      </EuiPageTemplate.Section>
    </I18nProvider>
  );
};
