/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  entityAliasOf,
  buildKeepClause,
  buildCursorClause,
  buildResolvedRowsFilter,
  buildCombinedFilterClause,
  ENTITY_TYPE_FILTER,
  ENTITY_ID_FIELD,
} from '../common';
import type { ColumnDescriptor, QueryArgs } from '../common';

const buildNativeEntityDataQuery = ({
  namespace,
  sort: { field, direction: dir },
  cursor,
  pageSize,
  rowsMode,
  searchExpression,
  entityExpression,
}: QueryArgs): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildResolvedRowsFilter(rowsMode),
    ...buildCombinedFilterClause(searchExpression, entityExpression),
    buildKeepClause(),
    ...buildCursorClause(cursor),
    `| SORT ${field} ${dir.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');

const buildNativeEntityCountQuery = ({
  namespace,
  rowsMode,
  searchExpression,
  entityExpression,
}: QueryArgs): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildResolvedRowsFilter(rowsMode),
    ...buildCombinedFilterClause(searchExpression, entityExpression),
    `| STATS total = COUNT(*)`,
  ].join('\n');

export const actionsColumn = {
  id: 'actions',
  displayAsText: 'Actions',
  initialWidth: 110,
  isSortable: false,
  isExpandable: false,
} as const satisfies ColumnDescriptor;

export const entityNameColumn = {
  id: 'entity.name',
  displayAsText: 'Entity name',
  initialWidth: 200,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: buildNativeEntityDataQuery,
  buildCountQuery: buildNativeEntityCountQuery,
} as const satisfies ColumnDescriptor;

export const resolvedToColumn = {
  id: 'entity.relationships.resolution.resolved_to',
  displayAsText: 'Resolved to',
  initialWidth: 200,
  isSortable: false,
  isExpandable: false,
} as const satisfies ColumnDescriptor;

export const entityTypeColumn = {
  id: 'entity.EngineMetadata.Type',
  displayAsText: 'Entity type',
  initialWidth: 120,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: buildNativeEntityDataQuery,
  buildCountQuery: buildNativeEntityCountQuery,
} as const satisfies ColumnDescriptor;

export const riskScoreColumn = {
  id: 'entity.risk.calculated_score_norm',
  displayAsText: 'Risk score',
  initialWidth: 120,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: buildNativeEntityDataQuery,
  buildCountQuery: buildNativeEntityCountQuery,
} as const satisfies ColumnDescriptor;

export const criticalityColumn = {
  id: 'asset.criticality',
  displayAsText: 'Asset criticality',
  initialWidth: 160,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: buildNativeEntityDataQuery,
  buildCountQuery: buildNativeEntityCountQuery,
} as const satisfies ColumnDescriptor;

export const sourceColumn = {
  id: 'entity.source',
  displayAsText: 'Source',
  initialWidth: 140,
  isSortable: false,
  isExpandable: false,
} as const satisfies ColumnDescriptor;

export const watchlistsColumn = {
  id: 'entity.attributes.watchlists',
  displayAsText: 'Watchlists',
  initialWidth: 200,
  isSortable: false,
  isExpandable: false,
} as const satisfies ColumnDescriptor;

export const firstSeenColumn = {
  id: 'entity.lifecycle.first_seen',
  displayAsText: 'First seen',
  initialWidth: 180,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: buildNativeEntityDataQuery,
  buildCountQuery: buildNativeEntityCountQuery,
} as const satisfies ColumnDescriptor;

export const lastSeenColumn = {
  id: '@timestamp',
  displayAsText: 'Last seen',
  initialWidth: 180,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: buildNativeEntityDataQuery,
  buildCountQuery: buildNativeEntityCountQuery,
} as const satisfies ColumnDescriptor;
