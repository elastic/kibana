/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  conditionToESQL,
  isAndCondition,
  isFilterCondition,
  isNotCondition,
  isOrCondition,
  type Condition,
} from '@kbn/streamlang';
import { escapeEsqlStringLiteral, esqlIsNotNullOrEmpty } from './strings';

/**
 * Drop-in wrapper around the streamlang `conditionToESQL` that optimizes two patterns:
 *
 * 1. Homogeneous OR-of-EQ chains into a single `` `field` IN (…) ``.
 *    The 18-name `fieldNotOneOfCondition` used by the user entity definition is the
 *    canonical example — eliminating 18 per-row scalar guards in the ES|QL planner.
 *
 * 2. `isNotEmpty` AND pattern `{and: [{field: X, exists: true}, {field: X, neq: ''}]}`
 *    into `X IS NOT NULL AND X != ""`, which the planner can push down more efficiently
 *    than streamlang's verbose `NOT(X IS NULL) AND COALESCE(X != "", TRUE)` form.
 *
 * All other condition shapes are passed through to the upstream `conditionToESQL`.
 * The upstream `@kbn/streamlang` transpiler is not modified.
 */
export function entityStoreConditionToESQL(condition: Condition): string {
  if (isOrCondition(condition)) {
    const inClause = buildInClauseOrNull(condition.or);
    if (inClause !== null) {
      return inClause;
    }
    return condition.or.map(entityStoreConditionToESQL).join(' OR ');
  }
  if (isNotCondition(condition)) {
    return `NOT (${entityStoreConditionToESQL(condition.not)})`;
  }
  if (isAndCondition(condition)) {
    const notEmptyField = getNotEmptyField(condition);
    if (notEmptyField !== null) {
      return esqlIsNotNullOrEmpty(notEmptyField);
    }
    return condition.and
      .map((c) => {
        const s = entityStoreConditionToESQL(c);
        // OR (non-IN) inside AND needs parens: AND binds tighter than OR in ES|QL
        if (isOrCondition(c) && buildInClauseOrNull(c.or) === null) {
          return `(${s})`;
        }
        return s;
      })
      .join(' AND ');
  }
  return conditionToESQL(condition);
}

/** Detects `{and: [{field: X, exists: true}, {field: X, neq: ''}]}` → returns X, or null. */
function getNotEmptyField(condition: Condition): string | null {
  if (!isAndCondition(condition) || condition.and.length !== 2) {
    return null;
  }
  const [first, second] = condition.and;
  if (!isFilterCondition(first) || !isFilterCondition(second)) {
    return null;
  }
  const f = first as unknown as Record<string, unknown>;
  const s = second as unknown as Record<string, unknown>;
  if (f.exists !== true || s.neq !== '' || f.field !== s.field) {
    return null;
  }
  return f.field as string;
}

/**
 * Returns null when IN optimization is not possible
 */
function buildInClauseOrNull(conditions: Condition[]): string | null {
  if (conditions.length < 2) {
    // only 1 condition, we let the upstream `conditionToESQL` handle it;
    return null;
  }
  if (!conditions.every((c) => isFilterCondition(c) && 'eq' in c)) {
    // we don't have a homogeneous OR-of-EQ pattern, bail out;
    return null;
  }

  const typed = conditions as Array<{ field: string; eq: unknown }>;
  const fieldSet = new Set(typed.map((c) => c.field));
  if (fieldSet.size !== 1) {
    // We have multiple fields, so it's not a homogeneous OR-of-EQ;
    return null;
  }

  const values = typed.map((c) => c.eq);
  if (!values.every((v) => typeof v === 'string')) {
    // If we are not comparing strings on every condition we won't optimize to IN clause
    return null;
  }

  const [field] = fieldSet;
  const inList = (values as string[]).map((v) => `"${escapeEsqlStringLiteral(v)}"`).join(', ');
  return `\`${field}\` IN (${inList})`;
}
