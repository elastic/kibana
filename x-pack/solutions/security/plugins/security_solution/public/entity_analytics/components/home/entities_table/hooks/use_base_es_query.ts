/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { buildEsQuery, type EsQueryConfig } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useContext, useEffect, useMemo } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { useGlobalFilterQuery } from '../../../../../common/hooks/use_global_filter_query';
import { DataViewContext } from '..';
import type { EntitiesBaseURLQuery } from './use_entity_url_state';

interface EntitiesBaseESQueryConfig {
  config: EsQueryConfig;
}

const getBaseQuery = ({
  dataView,
  query,
  filters,
  pageFilters,
  config,
}: EntitiesBaseURLQuery &
  EntitiesBaseESQueryConfig & {
    dataView: DataView | undefined;
  }) => {
  try {
    const mergedFilters = [...filters, ...(pageFilters ?? [])];

    return {
      query: buildEsQuery(dataView, query, mergedFilters, config),
    };
  } catch (error) {
    return {
      query: undefined,
      error: error instanceof Error ? error : new Error('Error constructing query'),
    };
  }
};

export const useBaseEsQuery = ({ filters = [], query, pageFilters = [] }: EntitiesBaseURLQuery) => {
  const {
    notifications: { toasts },
    uiSettings,
  } = useKibana().services;
  const { dataView } = useContext(DataViewContext);
  const { filterQuery: globalFilterQuery } = useGlobalFilterQuery();
  const allowLeadingWildcards = uiSettings.get('query:allowLeadingWildcards');
  const config: EsQueryConfig = useMemo(() => ({ allowLeadingWildcards }), [allowLeadingWildcards]);
  const baseEsQuery = useMemo(() => {
    const result = getBaseQuery({
      dataView,
      filters,
      pageFilters,
      query,
      config,
    });
    if (result.query && globalFilterQuery) {
      result.query.bool.filter = [...(result.query.bool.filter ?? []), globalFilterQuery];
    }
    return result;
  }, [dataView, filters, pageFilters, query, config, globalFilterQuery]);

  const handleMalformedQueryError = () => {
    const error = baseEsQuery instanceof Error ? baseEsQuery : undefined;
    if (error) {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.entitiesTable.search.queryErrorToastMessage',
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
