/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { Automation } from '../../data/automations/use_automations';
import { TRIGGER_LABEL_ORDER } from '../utils/trigger_display';
import {
  countFilterValues,
  EMPTY_FILTERS,
  hasActiveFilters,
  hasFilterSelections,
  matchesFilters,
  STATUS_ORDER,
  type AutomationFacets,
  type AutomationFilters,
} from '../utils/filter_automations';

const SEARCH_QUERY_PARAM = 'search';

const readSearchParam = (locationSearch: string) =>
  new URLSearchParams(locationSearch).get(SEARCH_QUERY_PARAM) ?? '';

export const useAutomationFilters = (
  automations: Automation[],
  getFacets: (automation: Automation) => AutomationFacets
) => {
  const history = useHistory();
  const { pathname, search: locationSearch } = useLocation();
  const searchFromUrl = useMemo(() => readSearchParam(locationSearch), [locationSearch]);
  const [filters, setFilters] = useState<AutomationFilters>(() => ({
    ...EMPTY_FILTERS,
    search: searchFromUrl,
  }));

  useEffect(() => {
    setFilters((current) =>
      current.search === searchFromUrl ? current : { ...current, search: searchFromUrl }
    );
  }, [searchFromUrl]);

  const writeSearchParam = useCallback(
    (search: string) => {
      const nextParams = new URLSearchParams(locationSearch);
      if (search.trim()) {
        nextParams.set(SEARCH_QUERY_PARAM, search);
      } else {
        nextParams.delete(SEARCH_QUERY_PARAM);
      }
      const nextSearch = nextParams.toString();
      if (nextSearch === new URLSearchParams(locationSearch).toString()) {
        return;
      }
      history.replace({ pathname, search: nextSearch });
    },
    [history, locationSearch, pathname]
  );

  const facets = automations.map(getFacets);
  const options = {
    statuses: countFilterValues(
      facets.map(({ statuses }) => statuses),
      STATUS_ORDER
    ),
    tags: countFilterValues(facets.map(({ tags }) => tags)),
    authors: countFilterValues(facets.map(({ author }) => [author])),
    triggers: countFilterValues(
      facets.map(({ triggers }) => triggers),
      TRIGGER_LABEL_ORDER
    ),
  };
  const available = (selected: string[], candidates: Array<{ label: string }>) =>
    selected.filter((value) => candidates.some(({ label }) => label === value));
  const activeFilters: AutomationFilters = {
    search: filters.search,
    statuses: available(filters.statuses, options.statuses),
    tags: available(filters.tags, options.tags),
    authors: available(filters.authors, options.authors),
    triggers: available(filters.triggers, options.triggers),
  };

  return {
    filters: activeFilters,
    setFilter: <K extends keyof AutomationFilters>(key: K, value: AutomationFilters[K]) => {
      setFilters((current) => ({ ...current, [key]: value }));
      if (key === 'search') {
        writeSearchParam(value as string);
      }
    },
    showOnlyStatus: (status: string) => {
      setFilters({ ...EMPTY_FILTERS, statuses: [status] });
      writeSearchParam('');
    },
    clearFilterSelections: () =>
      setFilters((current) => ({ ...EMPTY_FILTERS, search: current.search })),
    clearSearchAndFilters: () => {
      setFilters(EMPTY_FILTERS);
      writeSearchParam('');
    },
    hasFilterSelections: hasFilterSelections(activeFilters),
    hasActiveFilters: hasActiveFilters(activeFilters),
    visibleAutomations: automations.filter((automation, index) =>
      matchesFilters(automation, facets[index], activeFilters)
    ),
    options,
  };
};
