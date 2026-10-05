/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { Automation } from './use_automations';
import { TRIGGER_LABEL_ORDER } from '../utils/trigger_display';
import {
  countFilterValues,
  EMPTY_FILTERS,
  hasActiveFilters,
  matchesFilters,
  STATUS_ORDER,
  type AutomationFacets,
  type AutomationFilters,
} from '../utils/filter_automations';

export const useAutomationFilters = (
  automations: Automation[],
  getFacets: (automation: Automation) => AutomationFacets
) => {
  const [filters, setFilters] = useState<AutomationFilters>(EMPTY_FILTERS);
  const facets = automations.map(getFacets);

  return {
    filters,
    setFilter: <K extends keyof AutomationFilters>(key: K, value: AutomationFilters[K]) =>
      setFilters((current) => ({ ...current, [key]: value })),
    clearFilters: () => setFilters(EMPTY_FILTERS),
    hasFilters: hasActiveFilters(filters),
    visibleAutomations: automations.filter((automation, index) =>
      matchesFilters(automation, facets[index], filters)
    ),
    options: {
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
    },
  };
};
