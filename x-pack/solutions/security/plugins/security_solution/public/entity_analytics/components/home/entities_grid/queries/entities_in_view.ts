/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_FIELD, RESOLVED_TO_FIELD } from '../common';
import type { QueryArgs } from '../common';
import { ENTITY_TYPE_FILTER, buildRowRiskScoreSteps, getEntityAlias, toList } from './esql';
import type { EntityAggregation } from './esql';

export const buildEntityFilterConditions = ({
  entityExpression,
}: Pick<QueryArgs, 'entityExpression'>): string[] => (entityExpression ? [entityExpression] : []);

type InViewArgs = Pick<
  QueryArgs,
  'namespace' | 'rowsMode' | 'searchExpression' | 'entityExpression'
>;

/** The grid's rows; on resolved rows only main entities, as their aliases count for them. */
export const buildEntitiesInViewConditions = (args: InViewArgs): string[] => [
  ENTITY_TYPE_FILTER,
  ...(args.rowsMode === 'resolved' ? [`${RESOLVED_TO_FIELD} IS NULL`] : []),
  ...(args.searchExpression ? [args.searchExpression] : []),
  ...buildEntityFilterConditions(args),
];

export const buildEntitiesInViewSteps = (args: InViewArgs): string[] => [
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

/** The entities side of `FROM (source), (entities)`, marked in view so entities without data stay as rows. */
export const buildEntitiesInViewBranch = (
  args: QueryArgs,
  fields: readonly string[] = [],
  conditions: readonly string[] = []
): string[] => [
  ...buildEntitiesInViewSteps(args),
  ...buildRowRiskScoreSteps(args),
  ...conditions.map((condition) => `| WHERE ${condition}`),
  `| EVAL ${IN_VIEW_FIELD} = 1`,
  `| KEEP ${[`\`${ENTITY_ID_FIELD}\``, IN_VIEW_FIELD, ...fields].join(', ')}`,
];

/** Which of these ids are in view, search included: KQL can't run after a join, so joined rows are checked here. */
export const buildSearchedTargetsQuery = (
  args: InViewArgs,
  targetIds: readonly string[]
): string[] => [
  ...buildEntitiesInViewSteps(args),
  `| WHERE ${ENTITY_ID_FIELD} IN (${toList(targetIds)})`,
  `| KEEP \`entity.id\``,
  `| LIMIT ${targetIds.length}`,
];
