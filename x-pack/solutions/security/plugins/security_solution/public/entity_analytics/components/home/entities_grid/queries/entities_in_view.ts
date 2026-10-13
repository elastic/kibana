/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_FIELD, RESOLVED_TO_FIELD } from '../common';
import type { QueryArgs } from '../common';
import { ENTITY_TYPE_FILTER, getEntityAlias, toList } from './esql';
import { buildResolvedEntityValueCondition } from './resolved_entity_values';

// ── entities in view ─────────────────────────────────────────────────────────

/** Conditions of the entity filters on entity docs, which hold the entities' own values. */
export const buildEntityFilterConditions = (args: QueryArgs): string[] => {
  const groupValueCondition = buildResolvedEntityValueCondition(args);
  return [
    ...(args.entityExpression ? [args.entityExpression] : []),
    ...(groupValueCondition ? [groupValueCondition] : []),
  ];
};

/** Conditions on entity docs that make them rows of the grid (rows mode and filters). */
export const buildEntitiesInViewConditions = (args: QueryArgs): string[] => [
  ENTITY_TYPE_FILTER,
  ...(args.rowsMode === 'resolved' ? [`${RESOLVED_TO_FIELD} IS NULL`] : []),
  ...(args.searchExpression ? [args.searchExpression] : []),
  ...buildEntityFilterConditions(args),
];

/** Entity docs that are rows of the grid for the current rows mode and filters. */
export const buildEntitiesInViewSteps = (args: QueryArgs): string[] => [
  `FROM ${getEntityAlias(args.namespace)}`,
  ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
];

/** Number of grid rows: every sort except group size lists exactly the entities in view. */
export const buildEntitiesInViewCountQuery = (args: QueryArgs): string =>
  [...buildEntitiesInViewSteps(args), `| STATS total = COUNT(*)`].join('\n');

/** Marks rows that come from the entities in view rather than from the foreign index. */
export const IN_VIEW_FIELD = '_in_view';

/** The targets among `targetIds` that the search matches. */
export const buildSearchedTargetsQuery = (args: QueryArgs, targetIds: readonly string[]): string =>
  [
    ...buildEntitiesInViewSteps(args),
    `| WHERE ${ENTITY_ID_FIELD} IN (${toList(targetIds)})`,
    `| KEEP \`entity.id\``,
    `| LIMIT ${targetIds.length}`,
  ].join('\n');
