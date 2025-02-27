/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { SearchBarOwnProps } from '@kbn/unified-search-plugin/public/search_bar';
import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect } from 'react';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search_context';
import { getKqlFieldsWithFallback } from '../../utils/get_kql_field_names_with_fallback';
import { EntityTypesMultiSelect } from './entity_types_multi_select';

export function SearchBar() {
  const { refreshSubject$, dataView } = useUnifiedSearchContext();
  const inventoryRoute = useInventoryRouter();
  const {
    query,
    query: { kuery },
  } = useInventoryParams('/*');
  const {
    services: {
      unifiedSearch,
      telemetry,
      data: {
        query: { queryString: queryStringService },
      },
    },
  } = useKibana();

  const { SearchBar: UnifiedSearchBar } = unifiedSearch.ui;

  const syncSearchBarWithUrl = useCallback(() => {
    const _query = kuery ? { query: kuery, language: 'kuery' } : undefined;
    if (_query && !deepEqual(queryStringService.getQuery(), _query)) {
      queryStringService.setQuery(_query);
    }

    if (!_query) {
      queryStringService.clearQuery();
    }
  }, [kuery, queryStringService]);

  useEffect(() => {
    syncSearchBarWithUrl();
  }, [syncSearchBarWithUrl]);

  const handleQuerySubmit = useCallback<NonNullable<SearchBarOwnProps['onQuerySubmit']>>(
    ({ query: _query = { language: 'kuery', query: '' } }, isUpdate) => {
      inventoryRoute.push('/', {
        path: {},
        query: {
          ...query,
          kuery: _query?.query as string,
        },
      });

      if (!isUpdate) {
        refreshSubject$.next();
      }

      telemetry.reportEntityInventorySearchQuerySubmitted({
        kuery_fields: getKqlFieldsWithFallback(_query?.query as string),
        action: isUpdate ? 'submit' : 'refresh',
      });
    },
    [inventoryRoute, query, telemetry, refreshSubject$]
  );

  return (
    <UnifiedSearchBar
      appName="Inventory"
      displayStyle="inPage"
      indexPatterns={dataView ? [dataView] : undefined}
      renderQueryInputAppend={() => <EntityTypesMultiSelect />}
      onQuerySubmit={handleQuerySubmit}
      placeholder={i18n.translate('xpack.inventory.searchBar.placeholder', {
        defaultMessage:
          'Search for your entities by name or its metadata (e.g. entity.type : service)',
      })}
      showDatePicker={false}
      showFilterBar={false}
    />
  );
}
