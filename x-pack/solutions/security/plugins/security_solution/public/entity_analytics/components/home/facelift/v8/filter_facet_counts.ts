/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Facet option counts for the page filter group — derived from the same mock
 * rows the Entities table shows for the active Resolved / Raw view.
 */

import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { FaceliftRiskLevel, FaceliftWatchlist, TableView } from './data';
import { getFaceliftRiskLevel } from './data';
import { getRawRecords, getResolvedEntities } from './resolved_entities_data';

export interface FilterFacetCounts {
  entityTypes: Record<string, number>;
  watchlists: Record<string, number>;
  sources: Record<string, number>;
  riskLevels: Record<string, number>;
  criticalities: Record<string, number>;
}

const emptyCounts = (): FilterFacetCounts => ({
  entityTypes: {},
  watchlists: {},
  sources: {},
  riskLevels: {},
  criticalities: {},
});

const bump = (bucket: Record<string, number>, key: string) => {
  bucket[key] = (bucket[key] ?? 0) + 1;
};

/**
 * Counts how many table rows carry each facet value. Source / watchlist totals
 * can exceed the row count when a resolved entity has several sources or lists.
 */
export const getFilterFacetCounts = (tableView: TableView): FilterFacetCounts => {
  const counts = emptyCounts();
  const rows =
    tableView === 'resolved' ? getResolvedEntities() : getRawRecords();

  for (const row of rows) {
    bump(counts.entityTypes, row.entityType);
    bump(counts.riskLevels, getFaceliftRiskLevel(row.riskScore));
    bump(counts.criticalities, row.criticality);

    for (const source of row.sources) {
      bump(counts.sources, source);
    }
    for (const watchlist of row.watchlists) {
      bump(counts.watchlists, watchlist);
    }
  }

  return counts;
};

export const facetCount = (
  counts: FilterFacetCounts,
  facet: keyof FilterFacetCounts,
  value: EntityType | FaceliftWatchlist | string | FaceliftRiskLevel | CriticalityLevelWithUnassigned
): number => counts[facet][String(value)] ?? 0;
