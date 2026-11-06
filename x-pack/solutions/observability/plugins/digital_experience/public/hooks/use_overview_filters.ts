/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { formatFilterValues, parseFilterValues } from '../../common/filter_values';
import type { FilterValue } from '../../common/filter_values';
import { OVERVIEW_FILTER_NAMES } from '../../common/overview_filters';
import type {
  OverviewFilterName,
  OverviewFilterParams,
  OverviewFilters,
} from '../../common/overview_filters';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useUpdateUrlQuery } from './use_update_url_query';

/**
 * The Overview's filters from the URL (`browser`, `os`, `device`, `country` and `pageUrl`), as the
 * values they select and as the params the route takes, and setters that change only them; the
 * other params, e.g. the time range, stay.
 */
export const useOverviewFilters = () => {
  const { query } = useDigitalExperienceParams('/');
  const updateUrlQuery = useUpdateUrlQuery();

  const params = useMemo<OverviewFilterParams>(
    () =>
      Object.fromEntries(
        // An empty param, e.g. `?browser=`, counts as unset.
        OVERVIEW_FILTER_NAMES.flatMap((name) => (query[name] ? [[name, query[name]]] : []))
      ),
    [query]
  );

  const filters = useMemo<OverviewFilters>(
    () =>
      Object.fromEntries(
        OVERVIEW_FILTER_NAMES.flatMap((name) => {
          const values = parseFilterValues(params[name]);
          return values.length > 0 ? [[name, values]] : [];
        })
      ),
    [params]
  );

  /** Sets the values of the filters in `patch` at once, and removes a filter given none. */
  const setFilters = useCallback(
    (patch: OverviewFilters) =>
      updateUrlQuery(
        Object.fromEntries(
          Object.entries(patch).map(([name, values]) => [
            name,
            formatFilterValues(values) || undefined,
          ])
        )
      ),
    [updateUrlQuery]
  );

  const setFilter = useCallback(
    (name: OverviewFilterName, values: FilterValue[]) => setFilters({ [name]: values }),
    [setFilters]
  );

  const clearFilters = useCallback(
    () =>
      updateUrlQuery(Object.fromEntries(OVERVIEW_FILTER_NAMES.map((name) => [name, undefined]))),
    [updateUrlQuery]
  );

  return {
    filters,
    params,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters: Object.keys(filters).length > 0,
  };
};
