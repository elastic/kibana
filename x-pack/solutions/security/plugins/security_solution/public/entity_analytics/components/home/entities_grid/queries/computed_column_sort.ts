/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_FIELD } from '../common';
import type { QueryArgs } from '../common';
import {
  buildRowRiskScoreSteps,
  buildJoinedPageSteps,
  buildAliasesToResolvedEntitySteps,
} from './esql';
import type { EntityAggregation } from './esql';
import { IN_VIEW_AGGREGATION, IN_VIEW_FIELD, buildEntitiesInViewSteps } from './entities_in_view';

// ── computed column sorts ────────────────────────────────────────────────────

export interface ComputedColumnsOptions {
  /** Statements that go before the query, for example `SET …;`. */
  settings?: readonly string[];
  /** Pipeline over the source index that ends in `STATS … BY entity.id`. */
  sourceRows: readonly string[];
  /** Entity doc fields the merge needs besides `entity.id`. */
  entityFields?: readonly string[];
  /** Conditions on the entities side besides being in view. */
  entityConditions?: readonly string[];
  /** Merge aggregations that carry the computed columns, e.g. `x = MAX(x)`. */
  mergeAggregations: readonly string[];
  /**
   * For resolved rows: the computed columns, whose rows of an alias count for its resolved entity.
   * They aggregate after the merge, which has the entity docs to join, even when no source
   * index exists.
   */
  resolvedEntityAggregations?: readonly EntityAggregation[];
  /** Steps after the merge that compute the sort column. */
  afterMerge?: readonly string[];
}

interface ComputedColumnSortOptions extends ComputedColumnsOptions {
  sortField: string;
}

/**
 * One row per entity in view with its computed columns: the source aggregation and the
 * entities in view are read side by side and merged by `entity.id`, so entities without
 * source data stay as rows. Filters apply to the entities side.
 */
export const buildEntitiesInViewWithComputedColumns = (
  args: QueryArgs,
  {
    settings = [],
    sourceRows,
    entityFields = [],
    entityConditions = [],
    mergeAggregations,
    resolvedEntityAggregations,
    afterMerge = [],
  }: ComputedColumnsOptions
): string[] => [
  ...settings,
  'FROM (',
  ...sourceRows,
  '), (',
  ...buildEntitiesInViewSteps(args),
  ...buildRowRiskScoreSteps(args),
  ...entityConditions.map((condition) => `| WHERE ${condition}`),
  `| EVAL ${IN_VIEW_FIELD} = 1`,
  `| KEEP ${[`\`${ENTITY_ID_FIELD}\``, IN_VIEW_FIELD, ...entityFields].join(', ')}`,
  ')',
  `| STATS ${[...mergeAggregations, `${IN_VIEW_FIELD} = MAX(${IN_VIEW_FIELD})`].join(
    ', '
  )} BY \`${ENTITY_ID_FIELD}\``,
  ...(resolvedEntityAggregations
    ? buildAliasesToResolvedEntitySteps(args.concreteEntityIndexName, [
        ...resolvedEntityAggregations,
        IN_VIEW_AGGREGATION,
      ])
    : []),
  `| WHERE ${IN_VIEW_FIELD} == 1`,
  ...afterMerge,
];

/**
 * Sort query for a computed column that keeps every entity in view (see
 * {@link buildEntitiesInViewWithComputedColumns}): entities without a source value sort last, so the
 * result matches the native sorts' rows and their count.
 */
export const buildComputedColumnSortQuery = (
  args: QueryArgs,
  { sortField, ...options }: ComputedColumnSortOptions
): string[] => [
  ...buildEntitiesInViewWithComputedColumns(args, options),
  ...buildJoinedPageSteps(args, sortField),
];
