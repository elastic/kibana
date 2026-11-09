/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { FilterValue } from '../../common/filter_values';
import type {
  OverviewFilterName,
  OverviewFilters,
  OverviewSearchParams,
} from '../../common/overview_filters';
import {
  encodeOverviewFilters,
  overviewFiltersParamIssue,
  readOverviewFilters,
} from '../../common/overview_filters_param';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useUpdateUrlQuery } from './use_update_url_query';

/**
 * The Overview's filters from the URL's `filters` param (Kibana filters as rison, see
 * `overview_filters_param.ts`), as the values they select and as the param the routes take, and
 * setters that change only them; the other params, e.g. the time range, stay.
 */
export const useOverviewFilters = () => {
  const { query } = useDigitalExperienceParams('/');
  const updateUrlQuery = useUpdateUrlQuery();

  const filters = useMemo<OverviewFilters>(
    () => readOverviewFilters(query.filters),
    [query.filters]
  );

  // Written out from the values read, so a request gets the same param for the same filters.
  const params = useMemo<Pick<OverviewSearchParams, 'filters'>>(() => {
    const encoded = encodeOverviewFilters(filters);
    return encoded ? { filters: encoded } : {};
  }, [filters]);

  /**
   * Sets the values of the filters in `patch` at once, and removes a filter given none. A selection
   * the param cannot hold, e.g. a page URL past its limit, is left out: the router would drop the
   * whole param, and every other filter with it.
   */
  const setFilters = useCallback(
    (patch: OverviewFilters) => {
      const next = encodeOverviewFilters({ ...filters, ...patch });
      if (next !== undefined && overviewFiltersParamIssue(next) !== undefined) {
        return;
      }
      updateUrlQuery({ filters: next });
    },
    [filters, updateUrlQuery]
  );

  const setFilter = useCallback(
    (name: OverviewFilterName, values: FilterValue[]) => setFilters({ [name]: values }),
    [setFilters]
  );

  const clearFilters = useCallback(() => updateUrlQuery({ filters: undefined }), [updateUrlQuery]);

  return {
    filters,
    params,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters: Object.keys(filters).length > 0,
  };
};
