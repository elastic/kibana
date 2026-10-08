/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_FIELD } from '../common';
import type { QueryArgs } from '../common';
import { buildJoinedPageSteps } from './esql';
import { IN_VIEW_FIELD, buildEntitiesInViewSteps } from './entities_in_view';

// ── foreign sorts ────────────────────────────────────────────────────────────

export interface MergedForeignRowsOptions {
  /** Statements that go before the query, for example `SET …;`. */
  settings?: readonly string[];
  /** Pipeline over the foreign index that ends in `STATS … BY entity.id`. */
  foreignRows: readonly string[];
  /** Entity doc fields the merge needs besides `entity.id`. */
  entityFields?: readonly string[];
  /** Conditions on the entities side besides being in view. */
  entityConditions?: readonly string[];
  /** Merge aggregations that carry the foreign columns, e.g. `x = MAX(x)`. */
  mergeAggregations: readonly string[];
  /** Steps after the merge that compute the sort column. */
  afterMerge?: readonly string[];
}

interface MergedForeignSortOptions extends MergedForeignRowsOptions {
  sortField: string;
}

/**
 * One row per entity in view with its foreign columns: the foreign aggregation and the
 * entities in view are read side by side and merged by `entity.id`, so entities without
 * foreign data stay as rows. Filters apply to the entities side.
 */
export const buildMergedForeignRows = (
  args: QueryArgs,
  {
    settings = [],
    foreignRows,
    entityFields = [],
    entityConditions = [],
    mergeAggregations,
    afterMerge = [],
  }: MergedForeignRowsOptions
): string[] => [
  ...settings,
  'FROM (',
  ...foreignRows,
  '), (',
  ...buildEntitiesInViewSteps(args),
  ...entityConditions.map((condition) => `| WHERE ${condition}`),
  `| EVAL ${IN_VIEW_FIELD} = 1`,
  `| KEEP ${[`\`${ENTITY_ID_FIELD}\``, IN_VIEW_FIELD, ...entityFields].join(', ')}`,
  ')',
  `| STATS ${[...mergeAggregations, `${IN_VIEW_FIELD} = MAX(${IN_VIEW_FIELD})`].join(
    ', '
  )} BY \`${ENTITY_ID_FIELD}\``,
  `| WHERE ${IN_VIEW_FIELD} == 1`,
  ...afterMerge,
];

/**
 * Sort query for a foreign column that keeps every entity in view (see
 * {@link buildMergedForeignRows}): entities without foreign data sort last, so the
 * result matches the native sorts' rows and their count.
 */
export const buildMergedForeignSortQuery = (
  args: QueryArgs,
  { sortField, ...options }: MergedForeignSortOptions
): string =>
  [...buildMergedForeignRows(args, options), ...buildJoinedPageSteps(args, sortField)].join('\n');
