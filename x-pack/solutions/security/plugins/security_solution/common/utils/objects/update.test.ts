/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { update } from './update';

describe('update', () => {
  it('updates a nested property', () => {
    const obj = { a: { b: 1 } };
    const result = update(obj, 'a.b', (val) => val + 1);
    expect(result).toEqual({ a: { b: 2 } });
  });

  it('updates a nested property in point free style', () => {
    const obj = { a: { b: 1 } };
    const result = update<typeof obj, 'a.b', number>('a.b', (val) => val + 1)(obj);
    expect(result).toEqual({ a: { b: 2 } });
  });
});
