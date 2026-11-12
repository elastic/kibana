/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addExclusion, removeExclusion } from './exclusions';

describe('exclusions', () => {
  it('adds a value under its field, merging into an existing entry without duplicates', () => {
    const one = addExclusion([], 'entity.id', 'a');
    const two = addExclusion(one, 'entity.id', 'b');
    const other = addExclusion(two, 'cloud.account.id', '1');

    expect(one).toEqual([{ field: 'entity.id', values: ['a'] }]);
    expect(two).toEqual([{ field: 'entity.id', values: ['a', 'b'] }]);
    expect(other).toEqual([
      { field: 'entity.id', values: ['a', 'b'] },
      { field: 'cloud.account.id', values: ['1'] },
    ]);
    expect(addExclusion(other, 'entity.id', 'a')).toBe(other);
  });

  it('removes a value and drops the entry once empty', () => {
    const list = [
      { field: 'entity.id', values: ['a', 'b'] },
      { field: 'cloud.account.id', values: ['1'] },
    ];

    expect(removeExclusion(list, 'entity.id', 'a')).toEqual([
      { field: 'entity.id', values: ['b'] },
      { field: 'cloud.account.id', values: ['1'] },
    ]);
    expect(removeExclusion(list, 'cloud.account.id', '1')).toEqual([
      { field: 'entity.id', values: ['a', 'b'] },
    ]);
    expect(removeExclusion(list, 'entity.id', 'zzz')).toEqual(list);
  });
});
