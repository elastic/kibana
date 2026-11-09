/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColumnTypeMismatch } from './types';

const MAX_NAMED_MISMATCHES = 5;

const describeMismatch = ({ item, field, declaredType, actualType }: ColumnTypeMismatch): string =>
  `"${item.name}" (list "${item.list_id}", item "${item.item_id}") declares the column "${field}" as ${declaredType}, and the query outputs it as ${actualType}`;

/**
 * An exception item declares the type of each column that it tests. The rule fails when the query outputs the column with
 * another type, because the item would not be applied and the alerts that it excludes would be created.
 */
export class ColumnTypeMismatchError extends Error {
  public readonly mismatches: readonly ColumnTypeMismatch[];

  constructor(mismatches: readonly ColumnTypeMismatch[]) {
    const named = mismatches.slice(0, MAX_NAMED_MISMATCHES).map(describeMismatch).join('; ');
    const others =
      mismatches.length > MAX_NAMED_MISMATCHES
        ? ` and ${mismatches.length - MAX_NAMED_MISMATCHES} more`
        : '';
    super(
      `The rule did not run because exception items declare a column type that is not the type that the query outputs: ${named}${others}. Fix the type in these exception items, or remove them from this rule.`
    );
    this.name = 'ColumnTypeMismatchError';
    this.mismatches = mismatches;
  }
}
