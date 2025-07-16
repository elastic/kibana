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
import { useKibana } from '../../common/lib/kibana';
import { FiltersGlobal } from '../../common/components/filters_global/filters_global';
import { useDataViewContext } from '../hooks/data_view_context';
import type { AssetsURLQuery } from '../hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';

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

  return (
    <FiltersGlobal>
      <div css={{ borderBottom: euiTheme.border.thin }}>
        <SearchBar
          appName="Asset Inventory"
          showFilterBar={true}
          showQueryInput={true}
          showDatePicker={false}
          indexPatterns={[dataView]}
          onQuerySubmit={setQuery}
          onFiltersUpdated={(newFilters: Filter[]) => setQuery({ filters: newFilters })}
          placeholder={placeholder}
          query={{
            query: query?.query?.query || '',
            language: query?.query?.language || 'kuery',
          }}
          isLoading={isLoading}
        />
      </div>
    </FiltersGlobal>
  );
};
