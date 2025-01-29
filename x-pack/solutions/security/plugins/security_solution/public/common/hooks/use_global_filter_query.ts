/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { DataViewBase, EsQueryConfig, Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { useGlobalTime } from '../containers/use_global_time';
import { useKibana } from '../lib/kibana';
import { inputsSelectors } from '../store';
import { useDeepEqualSelector } from './use_selector';
import { useInvalidFilterQuery } from './use_invalid_filter_query';
import type { ESBoolQuery } from '../../../common/typed_json';

interface GlobalFilterQueryProps {
  extraFilter?: Filter;
  dataView?: DataViewBase;
}

/**
 * It builds a global filterQuery from KQL search bar and global filters.
 * It also validates the query and shows a warning if it's invalid.
 */
export const useGlobalFilterQuery = ({ extraFilter, dataView }: GlobalFilterQueryProps = {}) => {
  const { from, to } = useGlobalTime();
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const { uiSettings } = useKibana().services;

  const filters = useMemo(() => {
    const enabledFilters = globalFilters.filter((f) => f.meta.disabled === false);

    return extraFilter ? [...enabledFilters, extraFilter] : enabledFilters;
  }, [extraFilter, globalFilters]);

  const { filterQuery, kqlError } = useMemo(
    () => buildQueryOrError(query, filters, getEsQueryConfig(uiSettings), dataView),
    [dataView, query, filters, uiSettings]
  );

  const filterQueryStringified = useMemo(
    () => (filterQuery ? JSON.stringify(filterQuery) : undefined),
    [filterQuery]
  );

  useInvalidFilterQuery({
    id: 'GlobalFilterQuery', // It prevents displaying multiple times the same error popup
    filterQuery: filterQueryStringified,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

  return { filterQuery };
};

const buildQueryOrError = (
  query: Query,
  filters: Filter[],
  config: EsQueryConfig,
  dataView?: DataViewBase
): { filterQuery?: ESBoolQuery; kqlError?: Error } => {
  try {
    return { filterQuery: buildEsQuery(dataView, [query], filters, config) };
  } catch (kqlError) {
    return { kqlError };
  }
};
