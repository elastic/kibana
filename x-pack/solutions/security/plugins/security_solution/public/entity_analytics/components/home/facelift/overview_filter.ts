/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bridges the page's own controls — the filter group under the title and the
 * Overview band selection (a card, an attention row or a matrix cell) — to the
 * global filter manager. Everything the user picks becomes an ordinary filter
 * pill in the KQL bar, so the Entities table is driven through the regular
 * query path and each selection can be negated, disabled or removed like any
 * other filter.
 */

import { useEffect } from 'react';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { capitalize } from 'lodash';
import { useKibana } from '../../../../common/lib/kibana';
import { CRITICALITY_LEVEL_TITLE } from '../../asset_criticality/translations';
import { ENTITY_FIELDS } from '../entities_table/constants';
import type { ActiveFilter, PageFilters } from './data';
import { entitySourceToken, getEntityStoreEsHits, RISK_LEVEL_SCORE_RANGE } from './data';

/** Marks the pill as owned by the Overview band so we can find and replace it. */
export const OVERVIEW_FILTER_CONTROLLED_BY = 'entityAnalyticsOverviewBand';

export type PageFilterFacet = keyof PageFilters;

const FACETS: PageFilterFacet[] = ['entityTypes', 'sources', 'riskLevels', 'criticalities'];

const FACET_CONTROLLED_BY: Record<PageFilterFacet, string> = {
  entityTypes: 'entityAnalyticsPageFilter:entityType',
  sources: 'entityAnalyticsPageFilter:entitySource',
  riskLevels: 'entityAnalyticsPageFilter:riskLevel',
  criticalities: 'entityAnalyticsPageFilter:assetCriticality',
};

const FACET_FIELD: Record<PageFilterFacet, string> = {
  entityTypes: ENTITY_FIELDS.ENTITY_TYPE,
  sources: ENTITY_FIELDS.ENTITY_SOURCE,
  riskLevels: ENTITY_FIELDS.ENTITY_RISK,
  criticalities: ENTITY_FIELDS.ASSET_CRITICALITY,
};

const FACET_TITLE: Record<PageFilterFacet, string> = {
  entityTypes: 'Entity type',
  sources: 'Entity source',
  riskLevels: 'Risk level',
  criticalities: 'Asset criticality',
};

const buildFilter = ({
  facet,
  values,
  query,
  dataViewId,
}: {
  facet: PageFilterFacet;
  values: string[];
  query: Record<string, unknown>;
  dataViewId?: string;
}): Filter => ({
  meta: {
    alias: `${FACET_TITLE[facet]}: ${values.join(', ')}`,
    disabled: false,
    negate: false,
    type: 'custom',
    key: FACET_FIELD[facet],
    index: dataViewId,
    controlledBy: FACET_CONTROLLED_BY[facet],
  },
  query,
  $state: { store: FilterStateStore.APP_STATE },
});

/**
 * One pill per active facet. Risk level has no field of its own, so it becomes
 * a set of score ranges matching the bands the matrix and badges use.
 */
export const buildPageFilterPills = (pageFilters: PageFilters, dataViewId?: string): Filter[] => {
  const pills: Filter[] = [];
  const { entityTypes, sources, riskLevels, criticalities } = pageFilters;

  if (entityTypes.length) {
    pills.push(
      buildFilter({
        facet: 'entityTypes',
        values: entityTypes.map(capitalize),
        query: { terms: { [ENTITY_FIELDS.ENTITY_TYPE]: [...entityTypes] } },
        dataViewId,
      })
    );
  }

  if (sources.length) {
    pills.push(
      buildFilter({
        facet: 'sources',
        values: sources,
        query: { terms: { [ENTITY_FIELDS.ENTITY_SOURCE]: sources.map(entitySourceToken) } },
        dataViewId,
      })
    );
  }

  if (riskLevels.length) {
    pills.push(
      buildFilter({
        facet: 'riskLevels',
        values: riskLevels,
        query: {
          bool: {
            should: riskLevels.map((level) => ({
              range: { [ENTITY_FIELDS.ENTITY_RISK]: RISK_LEVEL_SCORE_RANGE[level] },
            })),
            minimum_should_match: 1,
          },
        },
        dataViewId,
      })
    );
  }

  if (criticalities.length) {
    pills.push(
      buildFilter({
        facet: 'criticalities',
        values: criticalities.map((level) => CRITICALITY_LEVEL_TITLE[level]),
        query: { terms: { [ENTITY_FIELDS.ASSET_CRITICALITY]: [...criticalities] } },
        dataViewId,
      })
    );
  }

  return pills;
};

/**
 * Overview selections such as "Untriaged high-risk" have no equivalent field in
 * the entity index, so they are expressed as the set of entity ids they resolve
 * to. That keeps the pill a real, editable filter rather than a parallel
 * filtering mechanism.
 */
const entityIdsForFilter = (activeFilter: ActiveFilter): string[] =>
  Array.from(new Set(getEntityStoreEsHits(activeFilter).map((hit) => hit._source.entity.id)));

export const buildOverviewFilter = (activeFilter: ActiveFilter, dataViewId?: string): Filter => ({
  meta: {
    alias: activeFilter.label,
    disabled: false,
    negate: false,
    type: 'custom',
    key: ENTITY_FIELDS.ENTITY_ID,
    index: dataViewId,
    controlledBy: OVERVIEW_FILTER_CONTROLLED_BY,
  },
  query: { terms: { [ENTITY_FIELDS.ENTITY_ID]: entityIdsForFilter(activeFilter) } },
  $state: { store: FilterStateStore.APP_STATE },
});

const MANAGED_CONTROLLED_BY = new Set<string>([
  OVERVIEW_FILTER_CONTROLLED_BY,
  ...Object.values(FACET_CONTROLLED_BY),
]);

const isManagedFilter = (filter: Filter): boolean =>
  Boolean(filter.meta?.controlledBy && MANAGED_CONTROLLED_BY.has(filter.meta.controlledBy));

/**
 * Keeps the page's selections and their filter pills in sync in both
 * directions: picking a value writes the pill, deleting the pill clears the
 * selection it came from.
 */
export const useSyncEntityFilters = ({
  activeFilter,
  pageFilters,
  onClearOverview,
  onClearFacet,
  dataViewId,
}: {
  activeFilter: ActiveFilter | null;
  pageFilters: PageFilters;
  onClearOverview: () => void;
  onClearFacet: (facet: PageFilterFacet) => void;
  dataViewId?: string;
}): void => {
  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;

  useEffect(() => {
    const filters = filterManager.getFilters();
    const others = filters.filter((filter) => !isManagedFilter(filter));
    const managed = filters.filter(isManagedFilter);

    const desired = [
      ...(activeFilter ? [buildOverviewFilter(activeFilter, dataViewId)] : []),
      ...buildPageFilterPills(pageFilters, dataViewId),
    ];

    // Only rewrite when a selection itself changed, so edits made from a pill's
    // own menu (negate, disable, pin) survive unrelated re-renders.
    const aliasByKey = new Map(
      managed.map((filter) => [filter.meta.controlledBy, filter.meta.alias])
    );
    const unchanged =
      aliasByKey.size === desired.length &&
      desired.every((filter) => aliasByKey.get(filter.meta.controlledBy) === filter.meta.alias);

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

      for (const facet of FACETS) {
        if (pageFilters[facet].length && !present.has(FACET_CONTROLLED_BY[facet])) {
          onClearFacet(facet);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [activeFilter, pageFilters, dataViewId, filterManager, onClearOverview, onClearFacet]);
};
