/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import { InvalidExceptionValuesError } from './invalid_exception_values_error';
import type { SkippedItem } from './types';

const invalidItem = (id: string): SkippedItem => ({
  item: getExceptionListItemSchemaMock({ item_id: id, name: `Name of ${id}`, list_id: 'list-1' }),
  code: 'value_not_supported',
  reason: 'value "bogus" cannot be written for a column of type ip at the end of the query',
  fields: ['source.ip'],
});

describe('InvalidExceptionValuesError', () => {
  it('names the item, its list, the value and the field', () => {
    const error = new InvalidExceptionValuesError([invalidItem('a')]);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      'The rule did not run because exception items have a value that cannot be used for the type of the field: "Name of a" (list "list-1", item "a"): value "bogus" cannot be written for a column of type ip at the end of the query, in the field "source.ip". Fix or delete these exception items.'
    );
  });

  it('names the first items and counts the others', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(invalidItem);
    const error = new InvalidExceptionValuesError(items);

    expect(error.message).toContain('"Name of e"');
    expect(error.message).not.toContain('"Name of f"');
    expect(error.message).toContain('and 2 more. Fix or delete');
    expect(error.invalidItems).toHaveLength(7);
  });
});
