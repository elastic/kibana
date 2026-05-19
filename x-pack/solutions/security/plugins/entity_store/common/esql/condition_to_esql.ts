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
import { escapeEsqlStringLiteral } from './strings';

/**
 * Drop-in wrapper around the streamlang `conditionToESQL` that optimizes
 * homogeneous OR-of-EQ chains into a single `COALESCE(field IN (…), FALSE)`.
 *
 * A homogeneous OR-of-EQ is an `or` node whose every child is `{field: X, eq: literal}`
 * for the same field X. The 18-name `fieldNotOneOfCondition` used by the user entity
 * definition is the canonical example. Replacing the 18-way OR with a single IN check
 * eliminates per-row scalar guard overhead in the ES|QL `CaseLazyEvaluator`.
 *
 * All other condition shapes are passed through to the upstream `conditionToESQL`.
 */
export function entityStoreConditionToESQL(condition: Condition): string {
  if (isOrCondition(condition)) {
    const inClause = buildInClauseOrNull(condition.or);
    if (inClause !== null) return inClause;
    return condition.or.map(entityStoreConditionToESQL).join(' OR ');
  }
  if (isNotCondition(condition)) {
    return `NOT (${entityStoreConditionToESQL(condition.not)})`;
  }
  if (isAndCondition(condition)) {
    return condition.and
      .map((c) => {
        const s = entityStoreConditionToESQL(c);
        // OR (non-IN) inside AND needs parens: AND binds tighter than OR in ES|QL
        if (isOrCondition(c) && buildInClauseOrNull(c.or) === null) return `(${s})`;
        return s;
      })
      .join(' AND ');
  }
  return conditionToESQL(condition);
}

function buildInClauseOrNull(conditions: Condition[]): string | null {
  if (conditions.length < 2) return null;
  if (!conditions.every((c) => isFilterCondition(c) && 'eq' in c)) return null;
  const typed = conditions as Array<{ field: string; eq: unknown }>;
  const fieldSet = new Set(typed.map((c) => c.field));
  if (fieldSet.size !== 1) return null;
  const values = typed.map((c) => c.eq);
  if (!values.every((v) => typeof v === 'string')) return null;
  const [field] = fieldSet;
  const inList = (values as string[]).map((v) => `"${escapeEsqlStringLiteral(v)}"`).join(', ');
  return `COALESCE(\`${field}\` IN (${inList}), FALSE)`;
}
