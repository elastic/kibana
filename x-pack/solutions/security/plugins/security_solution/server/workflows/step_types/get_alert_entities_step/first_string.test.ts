/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstString } from './first_string';

describe('firstString', () => {
  it.each([
    [['a', 'b'], 'a'],
    ['a', 'a'],
    [[], undefined],
    [[''], undefined],
    [[null], undefined],
    [[1], undefined],
    [undefined, undefined],
    [null, undefined],
  ])('reads %p as %p', (value, expected) => {
    expect(firstString(value)).toBe(expected);
  });
});
