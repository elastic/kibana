/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLVED_TO_FIELD } from '../common';
import type { QueryArgs } from '../common';
import { ENTITY_TYPE_FILTER, entityAliasOf } from './esql';

// ── entities in view ─────────────────────────────────────────────────────────

/** Conditions on entity docs that make them rows of the grid (rows mode and filters). */
export const buildEntitiesInViewConditions = ({
  rowsMode,
  searchExpression,
  entityExpression,
}: QueryArgs): string[] => [
  ENTITY_TYPE_FILTER,
  ...(rowsMode === 'resolved' ? [`${RESOLVED_TO_FIELD} IS NULL`] : []),
  ...(searchExpression ? [searchExpression] : []),
  ...(entityExpression ? [entityExpression] : []),
];

/** Entity docs that are rows of the grid for the current rows mode and filters. */
export const buildEntitiesInViewSteps = (args: QueryArgs): string[] => [
  `FROM ${entityAliasOf(args.namespace)}`,
  ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
];

/** Number of grid rows: every sort except group size lists exactly the entities in view. */
export const buildEntitiesInViewCountQuery = (args: QueryArgs): string =>
  [...buildEntitiesInViewSteps(args), `| STATS total = COUNT(*)`].join('\n');

/** Marks rows that come from the entities in view rather than from the foreign index. */
export const IN_VIEW_FIELD = '_in_view';
