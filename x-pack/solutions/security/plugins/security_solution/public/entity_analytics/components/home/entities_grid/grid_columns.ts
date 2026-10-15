/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import { alertCountQuerySpec, lastSeenAlertQuerySpec } from './queries/alerts';
import { anomalyCountQuerySpec } from './queries/anomalies';
import { riskScoreChangeQuerySpec } from './queries/risk_score_change';
import { groupSizeQuerySpec } from './queries/group_size';
import { caseCountQuerySpec } from './queries/cases';
import { nativeSortQuerySpec } from './queries/native';
import type { RowsMode } from './common';
import type { ColumnQuerySpec, PageEnricher, SortPageFetcher } from './queries/types';

// Which query each column runs, and why: see queries/README.md.

// Ordered list of all grid columns; GridColumnId and the rows-mode lists derive from it.
const COLUMNS = [
  { id: 'entity.name', displayAsText: 'Entity name', initialWidth: 200 },
  { id: 'group_size', displayAsText: 'Records', initialWidth: 100 },
  {
    id: 'entity.relationships.resolution.resolved_to',
    displayAsText: 'Resolved to',
    initialWidth: 200,
  },
  { id: 'entity.EngineMetadata.Type', displayAsText: 'Entity type', initialWidth: 120 },
  { id: 'entity.risk.calculated_score_norm', displayAsText: 'Risk score', initialWidth: 120 },
  { id: 'risk_score_change', displayAsText: 'Risk score change', initialWidth: 140 },
  { id: 'asset.criticality', displayAsText: 'Asset criticality', initialWidth: 160 },
  { id: 'entity.source', displayAsText: 'Source', initialWidth: 140 },
  { id: 'alert_count', displayAsText: 'Alerts', initialWidth: 140 },
  { id: 'last_seen_alert', displayAsText: 'Last alert', initialWidth: 180 },
  { id: 'anomaly_count', displayAsText: 'Anomalies', initialWidth: 120 },
  { id: 'case_count', displayAsText: 'Cases', initialWidth: 100 },
  { id: 'entity.attributes.watchlists', displayAsText: 'Watchlists', initialWidth: 200 },
  { id: 'entity.lifecycle.first_seen', displayAsText: 'First seen', initialWidth: 180 },
  { id: '@timestamp', displayAsText: 'Last seen', initialWidth: 180 },
] as const;

export type GridColumnId = (typeof COLUMNS)[number]['id'];

/** How the grid sorts and reads each column; columns without a spec are plain entity fields. */
const QUERY_SPECS: Readonly<Partial<Record<GridColumnId, ColumnQuerySpec>>> = {
  'entity.name': nativeSortQuerySpec,
  group_size: groupSizeQuerySpec,
  'entity.EngineMetadata.Type': nativeSortQuerySpec,
  'entity.risk.calculated_score_norm': nativeSortQuerySpec,
  risk_score_change: riskScoreChangeQuerySpec,
  'asset.criticality': nativeSortQuerySpec,
  alert_count: alertCountQuerySpec,
  last_seen_alert: lastSeenAlertQuerySpec,
  anomaly_count: anomalyCountQuerySpec,
  case_count: caseCountQuerySpec,
  'entity.lifecycle.first_seen': nativeSortQuerySpec,
  '@timestamp': nativeSortQuerySpec,
};

const GRID_COLUMN_ID_SET: ReadonlySet<string> = new Set(COLUMNS.map(({ id }) => id));

export const isGridColumnId = (id: string): id is GridColumnId => GRID_COLUMN_ID_SET.has(id);

const getQuerySpec = (id: string): ColumnQuerySpec | undefined =>
  isGridColumnId(id) ? QUERY_SPECS[id] : undefined;

export const findSortPageFetcher = (id: string): SortPageFetcher | undefined =>
  getQuerySpec(id)?.fetchSortPage;

/** Sortable columns with their sort page fetcher, in grid order. */
export const SORT_PAGE_FETCHERS: ReadonlyArray<[GridColumnId, SortPageFetcher]> = COLUMNS.flatMap(
  ({ id }) => {
    const fetchSortPage = QUERY_SPECS[id]?.fetchSortPage;
    return fetchSortPage ? [[id, fetchSortPage] as [GridColumnId, SortPageFetcher]] : [];
  }
);

/** Columns with an enricher, with the enricher, in grid order. */
export const COLUMN_ENRICHERS: ReadonlyArray<[GridColumnId, PageEnricher]> = COLUMNS.flatMap(
  ({ id }) => {
    const enricher = QUERY_SPECS[id]?.enricher;
    return enricher ? [[id, enricher] as [GridColumnId, PageEnricher]] : [];
  }
);

/** Fields the enrichers read; their cells stay blank until the page is enriched. */
export const ENRICHED_FIELDS: ReadonlySet<string> = new Set(
  COLUMN_ENRICHERS.flatMap(([, { fields }]) => fields)
);

const ALL_COLUMNS: readonly EuiDataGridColumn[] = COLUMNS.map((column) => ({
  ...column,
  isSortable: QUERY_SPECS[column.id]?.fetchSortPage != null,
  isExpandable: false,
  isResizable: false,
}));

const getColumnsWithout = (...ids: GridColumnId[]): readonly EuiDataGridColumn[] =>
  ALL_COLUMNS.filter(({ id }) => !(ids as string[]).includes(id));

// Resolved rows: entities grouped by identity; shows "Records" count, hides "Resolved to".
export const RESOLVED_ROWS_COLUMNS = getColumnsWithout(
  'entity.relationships.resolution.resolved_to'
);

// Individual rows: records; shows "Resolved to" identity, hides "Records" count.
export const INDIVIDUAL_ROWS_COLUMNS = getColumnsWithout('group_size');

// Child rows (expanded under a resolved entity): neither rows-mode column applies.
export const CHILD_ROWS_COLUMNS = getColumnsWithout(
  'group_size',
  'entity.relationships.resolution.resolved_to'
);

const getEnrichers = (columns: readonly EuiDataGridColumn[]): readonly PageEnricher[] =>
  columns.flatMap(({ id }) => getQuerySpec(id)?.enricher ?? []);

/** Enrichers of the columns each kind of row shows. */
export const PAGE_ENRICHERS: Readonly<Record<RowsMode | 'child', readonly PageEnricher[]>> = {
  resolved: getEnrichers(RESOLVED_ROWS_COLUMNS),
  individual: getEnrichers(INDIVIDUAL_ROWS_COLUMNS),
  child: getEnrichers(CHILD_ROWS_COLUMNS),
};
