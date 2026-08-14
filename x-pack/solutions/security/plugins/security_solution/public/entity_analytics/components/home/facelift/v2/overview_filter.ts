/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bridges Overview band selections (metric card Filter for / out) to the global
 * filter manager as ordinary KQL pills. The filter group under the search bar
 * filters metrics and the table in-page only — it does not write pills.
 */

import { useEffect } from 'react';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { useKibana } from '../../../../../common/lib/kibana';
import { ENTITY_FIELDS } from '../../entities_table/constants';
import type { ActiveFilter, PageFilters } from './data';
import { getEntityStoreEsHits } from './data';

/** Marks the pill as owned by the Overview band so we can find and replace it. */
export const OVERVIEW_FILTER_CONTROLLED_BY = 'entityAnalyticsOverviewBand';

export type PageFilterFacet = keyof PageFilters;

/** Legacy controlledBy ids from when filter-group facets wrote KQL pills. */
const LEGACY_FACET_CONTROLLED_BY = new Set([
  'entityAnalyticsPageFilter:entityType',
  'entityAnalyticsPageFilter:entitySource',
  'entityAnalyticsPageFilter:riskLevel',
  'entityAnalyticsPageFilter:assetCriticality',
]);

/**
 * Overview selections such as "Untriaged high-risk" have no equivalent field in
 * the entity index, so they are expressed as the set of entity ids they resolve
 * to. That keeps the pill a real, editable filter rather than a parallel
 * filtering mechanism.
 */
/** Positive match set for the pill query (exclude is expressed via `meta.negate`). */
const entityIdsForFilter = (activeFilter: ActiveFilter): string[] => {
  const positiveFilter: ActiveFilter =
    activeFilter.type === 'card' && activeFilter.exclude
      ? { ...activeFilter, exclude: false }
      : activeFilter;
  return Array.from(
    new Set(getEntityStoreEsHits(positiveFilter).map((hit) => hit._source.entity.id))
  );
};

export const buildOverviewFilter = (activeFilter: ActiveFilter, dataViewId?: string): Filter => ({
  meta: {
    alias: activeFilter.label,
    disabled: false,
    negate: activeFilter.type === 'card' && Boolean(activeFilter.exclude),
    type: 'custom',
    key: ENTITY_FIELDS.ENTITY_ID,
    index: dataViewId,
    controlledBy: OVERVIEW_FILTER_CONTROLLED_BY,
  },
  query: { terms: { [ENTITY_FIELDS.ENTITY_ID]: entityIdsForFilter(activeFilter) } },
  $state: { store: FilterStateStore.APP_STATE },
});

const isOverviewManagedFilter = (filter: Filter): boolean =>
  filter.meta?.controlledBy === OVERVIEW_FILTER_CONTROLLED_BY;

const isLegacyFacetPill = (filter: Filter): boolean =>
  Boolean(filter.meta?.controlledBy && LEGACY_FACET_CONTROLLED_BY.has(filter.meta.controlledBy));

/**
 * Keeps Overview band selections and their filter pills in sync in both
 * directions: picking a metric menu action writes the pill, deleting the pill
 * clears the overview selection. Filter-group facets are not synced.
 */
export const useSyncEntityFilters = ({
  activeFilter,
  onClearOverview,
  dataViewId,
}: {
  activeFilter: ActiveFilter | null;
  onClearOverview: () => void;
  dataViewId?: string;
}): void => {
  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;

  useEffect(() => {
    const filters = filterManager.getFilters();
    // Drop overview-managed + any leftover filter-group pills; keep user KQL filters.
    const others = filters.filter(
      (filter) => !isOverviewManagedFilter(filter) && !isLegacyFacetPill(filter)
    );
    const managed = filters.filter(isOverviewManagedFilter);

    const desired = activeFilter ? [buildOverviewFilter(activeFilter, dataViewId)] : [];

    // Only rewrite when a selection itself changed, so edits made from a pill's
    // own menu (disable, pin) survive unrelated re-renders. Include negate so
    // Filter for ↔ Filter out from metric menus updates the overview pill.
    const signature = (filter: Filter) =>
      `${filter.meta.controlledBy}|${filter.meta.alias}|${Boolean(filter.meta.negate)}`;
    const managedSignatures = new Set(managed.map(signature));
    const unchanged =
      managedSignatures.size === desired.length &&
      desired.every((filter) => managedSignatures.has(signature(filter))) &&
      !filters.some(isLegacyFacetPill);

    if (!unchanged) {
      filterManager.setFilters([...others, ...desired]);
    }

    // Subscribed after the sync above so we never react to our own write.
    const subscription = filterManager.getUpdates$().subscribe(() => {
      const present = new Set(
        filterManager.getFilters().map((filter) => filter.meta?.controlledBy)
      );

      if (activeFilter && !present.has(OVERVIEW_FILTER_CONTROLLED_BY)) {
        onClearOverview();
      }
    });

    return () => subscription.unsubscribe();
  }, [activeFilter, dataViewId, filterManager, onClearOverview]);
};
