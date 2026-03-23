/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineAndSortSavedObjects } from './combine_and_sort_saved_objects';
import type {
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';

interface TestAttributes {
  name?: string;
  value?: number;
  misc?: any;
}

function makeFindResponse(
  objects: Array<Partial<SavedObjectsFindResult<TestAttributes>>>,
  total?: number
): SavedObjectsFindResponse<TestAttributes> {
  return {
    page: 1,
    per_page: objects.length,
    total: total ?? objects.length,
    saved_objects: objects.map((obj, i) => ({
      id: `id-${i}`,
      type: 'test-type',
      attributes: {},
      references: [],
      score: 1,
      ...obj,
    })),
  };
}

describe('combineAndSortSavedObjects', () => {
  it('combines and sorts by string field ascending', () => {
    const res1 = makeFindResponse([
      { attributes: { name: 'Charlie' } },
      { attributes: { name: 'alice' } },
    ]);
    const res2 = makeFindResponse([{ attributes: { name: 'Bob' } }]);
    const result = combineAndSortSavedObjects(
      [res1, res2],
      { sortField: 'name', sortOrder: 'asc' },
      1,
      10
    );
    expect(result.saved_objects.map((o) => o.attributes.name)).toEqual(['alice', 'Bob', 'Charlie']);
    expect(result.total).toBe(3);
  });

  it('combines and sorts by string field descending', () => {
    const res1 = makeFindResponse([
      { attributes: { name: 'Charlie' } },
      { attributes: { name: 'alice' } },
    ]);
    const res2 = makeFindResponse([{ attributes: { name: 'Bob' } }]);
    const result = combineAndSortSavedObjects(
      [res1, res2],
      { sortField: 'name', sortOrder: 'desc' },
      1,
      10
    );
    expect(result.saved_objects.map((o) => o.attributes.name)).toEqual(['Charlie', 'Bob', 'alice']);
  });

  it('sorts by number field ascending', () => {
    const res = makeFindResponse([
      { attributes: { value: 10 } },
      { attributes: { value: 2 } },
      { attributes: { value: 5 } },
    ]);
    const result = combineAndSortSavedObjects(
      [res],
      { sortField: 'value', sortOrder: 'asc' },
      1,
      10
    );
    expect(result.saved_objects.map((o) => o.attributes.value)).toEqual([2, 5, 10]);
  });

  it('sorts by number field descending', () => {
    const res = makeFindResponse([
      { attributes: { value: 1 } },
      { attributes: { value: 3 } },
      { attributes: { value: 2 } },
    ]);
    const result = combineAndSortSavedObjects(
      [res],
      { sortField: 'value', sortOrder: 'desc' },
      1,
      10
    );
    expect(result.saved_objects.map((o) => o.attributes.value)).toEqual([3, 2, 1]);
  });

  it('handles pagination', () => {
    const res = makeFindResponse([
      { attributes: { name: 'a' } },
      { attributes: { name: 'b' } },
      { attributes: { name: 'c' } },
      { attributes: { name: 'd' } },
    ]);
    const result = combineAndSortSavedObjects([res], { sortField: 'name', sortOrder: 'asc' }, 2, 2);
    expect(result.saved_objects.map((o) => o.attributes.name)).toEqual(['c', 'd']);
    expect(result.page).toBe(2);
    expect(result.per_page).toBe(2);
  });

  it('removes .keyword from sortField', () => {
    const res = makeFindResponse([{ attributes: { name: 'b' } }, { attributes: { name: 'a' } }]);
    const result = combineAndSortSavedObjects(
      [res],
      { sortField: 'name.keyword', sortOrder: 'asc' },
      1,
      10
    );
    expect(result.saved_objects.map((o) => o.attributes.name)).toEqual(['a', 'b']);
  });

  it('falls back to string comparison for mixed types', () => {
    const res = makeFindResponse([
      { attributes: { misc: 2 } },
      { attributes: { misc: '10' } },
      { attributes: { misc: null } },
    ]);
    const result = combineAndSortSavedObjects(
      [res],
      { sortField: 'misc', sortOrder: 'asc' },
      1,
      10
    );
    expect(result.saved_objects.map((o) => o.attributes.misc)).toEqual(['10', 2, null]);
  });

  it('returns all objects unsorted if no sortField', () => {
    const res = makeFindResponse([{ attributes: { name: 'b' } }, { attributes: { name: 'a' } }]);
    const result = combineAndSortSavedObjects([res], {}, 1, 10);
    expect(result.saved_objects.length).toBe(2);
  });
});
