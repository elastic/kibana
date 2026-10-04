/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertCountColumn, lastSeenAlertColumn } from './alerts';
import { anomalyCountColumn } from './anomalies';
import { riskScoreChangeColumn } from './risk_score_change';
import { groupSizeColumn } from './group_size';
import { caseCountColumn } from './cases';
import {
  entityNameColumn,
  resolvedToColumn,
  entityTypeColumn,
  riskScoreColumn,
  criticalityColumn,
  sourceColumn,
  watchlistsColumn,
  firstSeenColumn,
  lastSeenColumn,
} from './native';
import { isSortableColumn } from '../common';
import type { ColumnDescriptor, EnrichFn, SortableColumn } from '../common';

/*
 * How the entities grid loads a page:
 * 1. The sort column builds the sort query. It returns one page plus one row, which
 *    tells if a next page exists. The cursor of the next page comes from the last row.
 * 2. The count query also comes from the active sort column, because the sort decides
 *    which rows exist. A native sort counts every entity that passes the filters.
 *    A foreign sort counts only entities that have a value for it, for example
 *    entities with alerts. The count's cache key has no cursor, so it runs once per
 *    sort and filter, not once per page.
 * 3. Each enrich function fills computed columns for the page rows only.
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

export type { ColumnDescriptor };

// Ordered list of all grid columns; rows-mode arrays and GridColumnId are derived from this.
export const ALL_COLUMNS = [
  entityNameColumn,
  groupSizeColumn,
  resolvedToColumn,
  entityTypeColumn,
  riskScoreColumn,
  riskScoreChangeColumn,
  criticalityColumn,
  sourceColumn,
  alertCountColumn,
  lastSeenAlertColumn,
  anomalyCountColumn,
  caseCountColumn,
  watchlistsColumn,
  firstSeenColumn,
  lastSeenColumn,
] as const satisfies ColumnDescriptor[];

export type GridColumnId = (typeof ALL_COLUMNS)[number]['id'];

const GRID_COLUMN_ID_SET: ReadonlySet<string> = new Set(ALL_COLUMNS.map((c) => c.id));

export const isGridColumnId = (id: string): id is GridColumnId => GRID_COLUMN_ID_SET.has(id);

// `ALL_COLUMNS` typed as `readonly ColumnDescriptor[]` for runtime access (`.find`, `.map`).
export const ALL_COLUMNS_LIST: readonly ColumnDescriptor[] = ALL_COLUMNS;

export const SORTABLE_COLUMNS: readonly SortableColumn[] =
  ALL_COLUMNS_LIST.filter(isSortableColumn);

const SORTABLE_COLUMNS_BY_ID: ReadonlyMap<string, SortableColumn> = new Map(
  SORTABLE_COLUMNS.map((column) => [column.id, column])
);

export const findSortableColumn = (id: string): SortableColumn | undefined =>
  SORTABLE_COLUMNS_BY_ID.get(id);

// Resolved rows: entities grouped by identity; shows "Records" count, hides "Resolved to".
export const RESOLVED_ROWS_COLUMNS = ALL_COLUMNS.filter(
  (c) => c.id !== 'entity.relationships.resolution.resolved_to'
);

// Individual rows: records; shows "Resolved to" identity, hides "Records" count.
export const INDIVIDUAL_ROWS_COLUMNS = ALL_COLUMNS.filter((c) => c.id !== 'group_size');

// Child rows (expanded under a resolved entity): neither rows-mode column applies.
export const CHILD_ROWS_COLUMNS = ALL_COLUMNS.filter(
  (c) => c.id !== 'group_size' && c.id !== 'entity.relationships.resolution.resolved_to'
);

export const ENRICH_FNS: EnrichFn[] = [
  ...new Set(ALL_COLUMNS_LIST.map((c) => c.enrichPage).filter((f): f is EnrichFn => f != null)),
];
