/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_FIELD, RESOLVED_TO_FIELD } from '../common';
import type { QueryArgs } from '../common';
import { ENTITY_TYPE_FILTER, getEntityAlias, toList } from './esql';
import type { EntityAggregation } from './esql';
import { applyResolvedEntityFilterOverrides } from './resolved_entities';

// ── entities in view ─────────────────────────────────────────────────────────

/** Conditions of the entity filters on entity docs, which hold the entities' own values. */
export const buildEntityFilterConditions = ({
  entityExpression,
  resolvedEntityFilterOverrides,
}: QueryArgs): string[] =>
  entityExpression
    ? [applyResolvedEntityFilterOverrides(entityExpression, resolvedEntityFilterOverrides)]
    : [];

/** Conditions on entity docs that make them rows of the grid (rows mode and filters). */
/** The entities that are rows, as conditions on the entity docs. */
export const buildEntitiesInViewConditions = (args: QueryArgs): string[] =>
  args.rowsMode === 'resolved'
    ? buildResolvedEntitiesInViewConditions(args)
    : buildIndividualEntitiesInViewConditions(args);

/** Individual rows: every entity of the grid's types that the search and the filters match. */
const buildIndividualEntitiesInViewConditions = (args: QueryArgs): string[] => [
  ENTITY_TYPE_FILTER,
  ...buildSearchConditions(args),
  ...buildEntityFilterConditions(args),
];

/** Resolved rows: the main entities only, as their aliases count for them. */
const buildResolvedEntitiesInViewConditions = (args: QueryArgs): string[] => [
  ENTITY_TYPE_FILTER,
  `${RESOLVED_TO_FIELD} IS NULL`,
  ...buildSearchConditions(args),
  ...buildEntityFilterConditions(args),
];

const buildSearchConditions = ({ searchExpression }: QueryArgs): string[] =>
  searchExpression ? [searchExpression] : [];

/** Entity docs that are rows of the grid for the current rows mode and filters. */
export const buildEntitiesInViewSteps = (args: QueryArgs): string[] => [
  `FROM ${getEntityAlias(args.namespace)}`,
  ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
];

/** Number of grid rows: every sort except group size lists exactly the entities in view. */
export const buildEntitiesInViewCountQuery = (args: QueryArgs): string[] => [
  ...buildEntitiesInViewSteps(args),
  `| STATS total = COUNT(*)`,
];

/** Marks rows that come from the entities in view rather than from the source index. */
export const IN_VIEW_FIELD = '_in_view';

/** An entity is in view when any of its rows is; a resolved entity, when any of its aliases is. */
export const IN_VIEW_AGGREGATION: EntityAggregation = {
  field: IN_VIEW_FIELD,
  aggregation: `MAX(${IN_VIEW_FIELD})`,
  resolvedEntity: 'MAX',
};

/** The targets among `targetIds` that the search matches. */
export const buildSearchedTargetsQuery = (
  args: QueryArgs,
  targetIds: readonly string[]
): string[] => [
  ...buildEntitiesInViewSteps(args),
  `| WHERE ${ENTITY_ID_FIELD} IN (${toList(targetIds)})`,
  `| KEEP \`entity.id\``,
  `| LIMIT ${targetIds.length}`,
];
