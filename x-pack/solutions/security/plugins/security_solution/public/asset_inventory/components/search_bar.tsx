/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { type EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { useKibana } from '../../common/lib/kibana';
import { FiltersGlobal } from '../../common/components/filters_global/filters_global';
import { useDataViewContext } from '../hooks/data_view_context';
import type { AssetsURLQuery } from '../hooks/use_asset_inventory_data_table';

interface AssetInventorySearchBarProps {
  setQuery(v: Partial<AssetsURLQuery>): void;
  loading: boolean;
  placeholder?: string;
  query: AssetsURLQuery;
}

export const AssetInventorySearchBar = ({
  loading,
  query,
  setQuery,
  placeholder = i18n.translate(
    'xpack.securitySolution.assetInventory.searchBar.searchPlaceholder',
    {
      defaultMessage: 'Filter your data using KQL syntax',
    }
  ),
}: AssetInventorySearchBarProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const { dataView } = useDataViewContext();

  return (
    <FiltersGlobal>
      <div css={getContainerStyle(euiTheme)}>
        <SearchBar
          appName="Asset Inventory"
          showFilterBar={false}
          showQueryInput={true}
          showDatePicker={false}
          isLoading={loading}
          indexPatterns={[dataView]}
          onQuerySubmit={setQuery}
          onFiltersUpdated={(filters: Filter[]) => setQuery({ filters })}
          placeholder={placeholder}
          query={{
            query: query?.query?.query || '',
            language: query?.query?.language || 'kuery',
          }}
          filters={query?.filters || []}
        />
      </div>
    </FiltersGlobal>
  );
};

const getContainerStyle = (theme: EuiThemeComputed) => css`
  border-bottom: ${theme.border.thin};
  background-color: ${theme.colors.backgroundBaseSubdued};
  padding: ${theme.size.base};
`;
