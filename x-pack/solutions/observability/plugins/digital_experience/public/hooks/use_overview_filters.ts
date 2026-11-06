/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { OVERVIEW_FILTER_NAMES } from '../../common/overview_filters';
import type { OverviewFilterName, OverviewFilters } from '../../common/overview_filters';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useUpdateUrlQuery } from './use_update_url_query';

/**
 * The Overview's filters from the URL (`browser`, `os`, `device`, `country` and `pageUrl`), and
 * setters that change only them; the other params, e.g. the time range, stay.
 */
export const useOverviewFilters = () => {
  const { query } = useDigitalExperienceParams('/');
  const updateUrlQuery = useUpdateUrlQuery();

  const filters = useMemo<OverviewFilters>(
    () =>
      Object.fromEntries(
        // An empty param, e.g. `?browser=`, counts as unset.
        OVERVIEW_FILTER_NAMES.flatMap((name) => (query[name] ? [[name, query[name]]] : []))
      ),
    [query]
  );

  const setFilter = useCallback(
    (name: OverviewFilterName, value: string | undefined) => updateUrlQuery({ [name]: value }),
    [updateUrlQuery]
  );

  const clearFilters = useCallback(
    () =>
      updateUrlQuery(Object.fromEntries(OVERVIEW_FILTER_NAMES.map((name) => [name, undefined]))),
    [updateUrlQuery]
  );

  return { filters, setFilter, clearFilters, hasActiveFilters: Object.keys(filters).length > 0 };
};
