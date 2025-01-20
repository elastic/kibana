/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { buildEsQuery, type EsQueryConfig } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useEffect, useMemo } from 'react';
import { useDataViewContext } from '../data_view_context';
import { useKibana } from '../../../common/lib/kibana';
import type { AssetsBaseURLQuery } from './use_asset_inventory_data_table';

interface AssetsBaseESQueryConfig {
  config: EsQueryConfig;
}

const getBaseQuery = ({
  dataView,
  query,
  filters,
  config,
}: AssetsBaseURLQuery &
  AssetsBaseESQueryConfig & {
    dataView: DataView | undefined;
  }) => {
  try {
    return {
      query: buildEsQuery(dataView, query, filters, config), // will throw for malformed query
    };
  } catch (error) {
    return {
      query: undefined,
      error: error instanceof Error ? error : new Error('Unknown Error'),
    };
  }
};

export const useBaseEsQuery = ({
  filters = [],
  query,
  nonPersistedFilters,
}: AssetsBaseURLQuery) => {
  const {
    notifications: { toasts },
    data: {
      query: { filterManager, queryString },
    },
    uiSettings,
  } = useKibana().services;
  const { dataView } = useDataViewContext();
  const allowLeadingWildcards = uiSettings.get('query:allowLeadingWildcards');
  const config: EsQueryConfig = useMemo(() => ({ allowLeadingWildcards }), [allowLeadingWildcards]);
  const baseEsQuery = useMemo(
    () =>
      getBaseQuery({
        dataView,
        filters: filters.concat(nonPersistedFilters ?? []).flat(),
        query,
        config,
      }),
    [dataView, filters, nonPersistedFilters, query, config]
  );

  /**
   * Sync filters with the URL query
   */
  useEffect(() => {
    filterManager.setAppFilters(filters);
    queryString.setQuery(query);
  }, [filters, filterManager, queryString, query]);

  const handleMalformedQueryError = () => {
    const error = baseEsQuery instanceof Error ? baseEsQuery : undefined;
    if (error) {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.securitySolution.assetInventory.allAssets.search.queryErrorToastMessage',
          {
            defaultMessage: 'Query Error',
          }
        ),
        toastLifeTimeMs: 1000 * 5,
      });
    }
  };

  useEffect(handleMalformedQueryError, [baseEsQuery, toasts]);

  return baseEsQuery;
};
