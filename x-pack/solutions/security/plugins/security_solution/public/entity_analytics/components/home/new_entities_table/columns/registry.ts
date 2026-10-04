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
import type { ColumnDescriptor, EnrichFn } from '../common';

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
