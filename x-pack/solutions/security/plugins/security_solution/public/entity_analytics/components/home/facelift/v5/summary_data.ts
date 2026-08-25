/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Summary pie aggregations for facelift v.5 — counted over the same corpus the
 * Entities table shows for the active page filters + Resolved / Raw view.
 */

import { RiskSeverity } from '../../../../../../common/search_strategy';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';
import type { SeverityCount } from '../../../severity/types';
import type { PageFilters, TableView } from './data';
import { EMPTY_PAGE_FILTERS, FACELIFT_WATCHLISTS, getFaceliftRiskLevel } from './data';
import type { EntityRow } from './resolved_entities_data';
import { getRawRecords, getResolvedEntities } from './resolved_entities_data';

export interface SummarySourceCount {
  key: string;
  value: number;
}

/** Legend / pie bucket for entities with no watchlist membership. */
export const NOT_IN_WATCHLISTS_KEY = 'Not in watchlists';

export type SummaryCriticalityCount = Record<CriticalityLevelWithUnassigned, number>;

/** Entity types shown in the Entities table / filter group (excludes generic). */
export const SUMMARY_ENTITY_TYPES: Array<
  EntityType.user | EntityType.host | EntityType.service
> = [EntityType.user, EntityType.host, EntityType.service];

export type SummaryEntityTypeCount = Record<
  EntityType.user | EntityType.host | EntityType.service,
  number
>;

const EMPTY_SEVERITY_COUNT: SeverityCount = {
  [RiskSeverity.Critical]: 0,
  [RiskSeverity.High]: 0,
  [RiskSeverity.Moderate]: 0,
  [RiskSeverity.Low]: 0,
  [RiskSeverity.Unknown]: 0,
};

const EMPTY_CRITICALITY_COUNT: SummaryCriticalityCount = {
  extreme_impact: 0,
  high_impact: 0,
  medium_impact: 0,
  low_impact: 0,
  unassigned: 0,
};

const faceliftRiskToSeverity = (level: ReturnType<typeof getFaceliftRiskLevel>): RiskSeverity => {
  switch (level) {
    case 'Critical':
      return RiskSeverity.Critical;
    case 'High':
      return RiskSeverity.High;
    case 'Medium':
      return RiskSeverity.Moderate;
    case 'Low':
      return RiskSeverity.Low;
    default:
      return RiskSeverity.Unknown;
  }
};

/** Same rows the Entities table renders for the current filter group + view. */
export const getSummaryRows = (
  pageFilters: PageFilters = EMPTY_PAGE_FILTERS,
  tableView: TableView = 'resolved'
): EntityRow[] =>
  tableView === 'raw'
    ? getRawRecords(undefined, pageFilters)
    : getResolvedEntities(undefined, pageFilters);

export const getSummaryRiskLevelCounts = (
  pageFilters: PageFilters = EMPTY_PAGE_FILTERS,
  tableView: TableView = 'resolved'
): SeverityCount => {
  const counts = { ...EMPTY_SEVERITY_COUNT };
  for (const row of getSummaryRows(pageFilters, tableView)) {
    counts[faceliftRiskToSeverity(getFaceliftRiskLevel(row.riskScore))] += 1;
  }
  return counts;
};

export const getSummaryCriticalityCounts = (
  pageFilters: PageFilters = EMPTY_PAGE_FILTERS,
  tableView: TableView = 'resolved'
): SummaryCriticalityCount => {
  const counts = { ...EMPTY_CRITICALITY_COUNT };
  for (const row of getSummaryRows(pageFilters, tableView)) {
    counts[row.criticality] += 1;
  }
  return counts;
};

const EMPTY_ENTITY_TYPE_COUNT: SummaryEntityTypeCount = {
  [EntityType.user]: 0,
  [EntityType.host]: 0,
  [EntityType.service]: 0,
};

export const getSummaryEntityTypeCounts = (
  pageFilters: PageFilters = EMPTY_PAGE_FILTERS,
  tableView: TableView = 'resolved'
): SummaryEntityTypeCount => {
  const counts = { ...EMPTY_ENTITY_TYPE_COUNT };
  for (const row of getSummaryRows(pageFilters, tableView)) {
    if (
      row.entityType === EntityType.user ||
      row.entityType === EntityType.host ||
      row.entityType === EntityType.service
    ) {
      counts[row.entityType] += 1;
    }
  }
  return counts;
};

/**
 * Primary source per entity so leaf totals equal the Entities table row count.
 * (Resolved rows use their first contributing source.)
 */
export const getSummarySourceCounts = (
  pageFilters: PageFilters = EMPTY_PAGE_FILTERS,
  tableView: TableView = 'resolved'
): SummarySourceCount[] => {
  const bySource = new Map<string, number>();
  for (const row of getSummaryRows(pageFilters, tableView)) {
    const source = row.sources[0] ?? 'Unknown';
    bySource.set(source, (bySource.get(source) ?? 0) + 1);
  }
  return Array.from(bySource.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
};

/**
 * Primary watchlist per entity (first membership), or {@link NOT_IN_WATCHLISTS_KEY}
 * when the entity is on no lists — so pie totals match the Entities table row count.
 * Order: known watchlists, then "Not in watchlists".
 */
export const getSummaryWatchlistCounts = (
  pageFilters: PageFilters = EMPTY_PAGE_FILTERS,
  tableView: TableView = 'resolved'
): SummarySourceCount[] => {
  const byWatchlist = new Map<string, number>();
  for (const name of FACELIFT_WATCHLISTS) {
    byWatchlist.set(name, 0);
  }
  byWatchlist.set(NOT_IN_WATCHLISTS_KEY, 0);

  for (const row of getSummaryRows(pageFilters, tableView)) {
    if (row.watchlists.length === 0) {
      byWatchlist.set(
        NOT_IN_WATCHLISTS_KEY,
        (byWatchlist.get(NOT_IN_WATCHLISTS_KEY) ?? 0) + 1
      );
    } else {
      const primary = row.watchlists[0];
      byWatchlist.set(primary, (byWatchlist.get(primary) ?? 0) + 1);
    }
  }

  return [
    ...FACELIFT_WATCHLISTS.map((key) => ({ key, value: byWatchlist.get(key) ?? 0 })),
    {
      key: NOT_IN_WATCHLISTS_KEY,
      value: byWatchlist.get(NOT_IN_WATCHLISTS_KEY) ?? 0,
    },
  ];
};
