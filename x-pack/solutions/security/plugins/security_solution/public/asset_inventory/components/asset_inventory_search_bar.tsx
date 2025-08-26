/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { useRefresh } from '@kbn/cloud-security-posture/src/hooks/use_refresh';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  ASSET_INVENTORY_APP_NAME,
  ASSET_INVENTORY_SEARCH_QUERY_PERFORMED,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { useKibana } from '../../common/lib/kibana';
import { FiltersGlobal } from '../../common/components/filters_global/filters_global';
import { useDataViewContext } from '../hooks/data_view_context';
import type { AssetsURLQuery } from '../hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';
import { QUERY_KEY_ASSET_INVENTORY } from '../constants';

interface AssetInventorySearchBarProps {
  setQuery(v: Partial<AssetsURLQuery>): void;
  placeholder?: string;
  query: AssetsURLQuery;
  isLoading: boolean;
}

export const AssetInventorySearchBar = ({
  query,
  setQuery,
  placeholder = i18n.translate(
    'xpack.securitySolution.assetInventory.searchBar.searchPlaceholder',
    {
      defaultMessage: 'Filter your data using KQL syntax',
    }
  ),
  isLoading,
}: AssetInventorySearchBarProps) => {
  const { dataView } = useDataViewContext();
  const { euiTheme } = useEuiTheme();
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const { refresh, isRefreshing } = useRefresh(QUERY_KEY_ASSET_INVENTORY);

  return (
    <FiltersGlobal>
      <div css={{ borderBottom: euiTheme.border.thin }}>
        <SearchBar
          appName="Asset Inventory"
          showFilterBar={true}
          showQueryInput={true}
          showDatePicker={false}
          indexPatterns={[dataView]}
          onQuerySubmit={(payload, isUpdated) => {
            if (isUpdated) {
              uiMetricService.trackUiMetric(
                METRIC_TYPE.CLICK,
                ASSET_INVENTORY_SEARCH_QUERY_PERFORMED,
                ASSET_INVENTORY_APP_NAME
              );
              setQuery(payload);
            } else {
              refresh();
            }
          }}
          onFiltersUpdated={(newFilters: Filter[]) => setQuery({ filters: newFilters })}
          placeholder={placeholder}
          query={{
            query: query?.query?.query || '',
            language: query?.query?.language || 'kuery',
          }}
          isLoading={isLoading || isRefreshing}
        />
      </div>
    </FiltersGlobal>
  );
};
