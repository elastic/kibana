/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * v.5: Needs-attention metric cards filter the entities table in-page only.
 * They must not write (or leave behind) KQL pills in the search bar.
 */

import { useEffect } from 'react';
import type { Filter } from '@kbn/es-query';
import { useKibana } from '../../../../../common/lib/kibana';

/** Legacy controlledBy id from when Overview band wrote KQL pills. */
export const OVERVIEW_FILTER_CONTROLLED_BY = 'entityAnalyticsOverviewBand';

const LEGACY_FACET_CONTROLLED_BY = new Set([
  'entityAnalyticsPageFilter:entityType',
  'entityAnalyticsPageFilter:entitySource',
  'entityAnalyticsPageFilter:riskLevel',
  'entityAnalyticsPageFilter:assetCriticality',
]);

const isOverviewManagedFilter = (filter: Filter): boolean =>
  filter.meta?.controlledBy === OVERVIEW_FILTER_CONTROLLED_BY;

const isLegacyFacetPill = (filter: Filter): boolean =>
  Boolean(filter.meta?.controlledBy && LEGACY_FACET_CONTROLLED_BY.has(filter.meta.controlledBy));

/**
 * Strips leftover Overview / facet pills from the filter manager once.
 * Metric card selection lives in React state and is applied by the table.
 */
export const useSyncEntityFilters = (): void => {
  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;

  useEffect(() => {
    const filters = filterManager.getFilters();
    const cleaned = filters.filter(
      (filter) => !isOverviewManagedFilter(filter) && !isLegacyFacetPill(filter)
    );
    if (cleaned.length !== filters.length) {
      filterManager.setFilters(cleaned);
    }
    // Run once on mount to clear pills from prior versions / sessions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterManager]);
};
