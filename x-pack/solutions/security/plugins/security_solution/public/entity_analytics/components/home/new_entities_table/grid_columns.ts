/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import { alertCountQuerySpec, lastSeenAlertQuerySpec } from './columns/alerts';
import { anomalyCountQuerySpec } from './columns/anomalies';
import { riskScoreChangeQuerySpec } from './columns/risk_score_change';
import { groupSizeQuerySpec } from './columns/group_size';
import { caseCountQuerySpec } from './columns/cases';
import { nativeSortQuerySpec } from './columns/native';
import type { ColumnQuerySpec, PageEnricher, RowsMode, SortQuerySpec } from './common';

/*
 * How the entities grid loads a page:
 * 1. The sort column builds the sort query. It returns one page plus one row, which
 *    tells if a next page exists. The cursor of the next page comes from the last row.
 * 2. The count query also comes from the active sort column, because the sort decides
 *    which rows exist. A native sort counts every entity that passes the filters.
 *    A foreign sort counts only entities that have a value for it, for example
 *    entities with alerts. The count's cache key has no cursor, so it runs once per
 *    sort and filter, not once per page.
 * 3. Each enricher reads computed columns for the page rows only.
 *
 * Terms used in this folder:
 * - Native sort: the sort field is on the entity doc. One query on the entity index.
 * - Foreign sort: STATS computes the sort value per entity.id, from another index
 *   (alerts, risk scores, anomalies) or from resolution groups (group size).
 *   LOOKUP JOIN then adds the entity doc.
 * - Page rows: the entity rows of the current page.
 * - Stamped alert: an alert with `kibana.alert.entity.id`. An unstamped alert has no
 *   such field; its EUIDs come from the raw user, host and service fields.
 * - EUID: the entity id derived from raw identity fields, for example `host:<host.id>`.
 * - Resolution group: a target entity and the alias entities resolved to it.
 * - Pushable prefilter: a filter that ES|QL pushes down to Lucene and that matches a
 *   superset of an exact filter that follows it. It makes the exact filter cheap.
 * - Search expression: KQL and filter pills. Entity expression: URL filters and tiles.
 */

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

const querySpecOf = (id: string): ColumnQuerySpec | undefined =>
  isGridColumnId(id) ? QUERY_SPECS[id] : undefined;

export const findSortQuerySpec = (id: string): SortQuerySpec | undefined => querySpecOf(id)?.sort;

/** Sortable columns with their sort, in grid order. */
export const SORT_QUERY_SPECS: ReadonlyArray<[GridColumnId, SortQuerySpec]> = COLUMNS.flatMap(
  ({ id }) => {
    const sort = QUERY_SPECS[id]?.sort;
    return sort ? [[id, sort] as [GridColumnId, SortQuerySpec]] : [];
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
  isSortable: QUERY_SPECS[column.id]?.sort != null,
  isExpandable: false,
  isResizable: false,
}));

const columnsWithout = (...ids: GridColumnId[]): readonly EuiDataGridColumn[] =>
  ALL_COLUMNS.filter(({ id }) => !(ids as string[]).includes(id));

// Resolved rows: entities grouped by identity; shows "Records" count, hides "Resolved to".
export const RESOLVED_ROWS_COLUMNS = columnsWithout('entity.relationships.resolution.resolved_to');

// Individual rows: records; shows "Resolved to" identity, hides "Records" count.
export const INDIVIDUAL_ROWS_COLUMNS = columnsWithout('group_size');

// Child rows (expanded under a resolved entity): neither rows-mode column applies.
export const CHILD_ROWS_COLUMNS = columnsWithout(
  'group_size',
  'entity.relationships.resolution.resolved_to'
);

const enrichersOf = (columns: readonly EuiDataGridColumn[]): readonly PageEnricher[] =>
  columns.flatMap(({ id }) => querySpecOf(id)?.enricher ?? []);

/** Enrichers of the columns each kind of row shows. */
export const PAGE_ENRICHERS: Readonly<Record<RowsMode | 'child', readonly PageEnricher[]>> = {
  resolved: enrichersOf(RESOLVED_ROWS_COLUMNS),
  individual: enrichersOf(INDIVIDUAL_ROWS_COLUMNS),
  child: enrichersOf(CHILD_ROWS_COLUMNS),
};
