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
  actionsColumn,
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

// Ordered list of all grid columns; view arrays and GridColumnId are derived from this.
export const ALL_COLUMNS = [
  actionsColumn,
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

// `ALL_COLUMNS` typed as `readonly ColumnDescriptor[]` for runtime access (`.find`, `.map`).
export const ALL_COLUMNS_LIST: readonly ColumnDescriptor[] = ALL_COLUMNS;

// Resolved view: entities grouped by identity; shows "Records" count, hides "Resolved to".
export const RESOLVED_VIEW_COLUMNS = ALL_COLUMNS.filter(
  (c) => c.id !== 'entity.relationships.resolution.resolved_to'
);

// Raw view: individual unresolved records; shows "Resolved to" identity, hides "Records" count.
export const RAW_VIEW_COLUMNS = ALL_COLUMNS.filter((c) => c.id !== 'group_size');

// Child rows (expanded under a resolved entity): neither grouping column applies.
export const CHILD_VIEW_COLUMNS = ALL_COLUMNS.filter(
  (c) => c.id !== 'group_size' && c.id !== 'entity.relationships.resolution.resolved_to'
);

export const ENRICH_FNS: EnrichFn[] = [
  ...new Set(ALL_COLUMNS_LIST.map((c) => c.enrichPage).filter((f): f is EnrichFn => f != null)),
];
