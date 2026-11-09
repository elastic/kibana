/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import { ColumnTypeMismatchError } from './column_type_mismatch_error';
import type { ColumnTypeMismatch } from './types';

const mismatch = (id: string): ColumnTypeMismatch => ({
  item: getExceptionListItemSchemaMock({ item_id: id, name: `Name of ${id}`, list_id: 'list-1' }),
  field: 'source.ip',
  declaredType: 'keyword',
  actualType: 'ip',
});

describe('ColumnTypeMismatchError', () => {
  it('names the item, its list, the column and both types', () => {
    const error = new ColumnTypeMismatchError([mismatch('a')]);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      'The rule did not run because exception items declare a column type that is not the type that the query outputs: "Name of a" (list "list-1", item "a") declares the column "source.ip" as keyword, and the query outputs it as ip. Fix the type in these exception items, or remove them from this rule.'
    );
  });

  it('names the first 5 mismatches and counts the others', () => {
    const error = new ColumnTypeMismatchError(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(mismatch));

    expect(error.message).toContain('"Name of e"');
    expect(error.message).not.toContain('"Name of f"');
    expect(error.message).toContain('and 2 more. Fix the type');
    expect(error.mismatches).toHaveLength(7);
  });
});
