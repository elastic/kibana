/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from './merge';

describe('merge', () => {
  it('merges two objects', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    expect(merge(target, source)).toEqual({ a: 1, b: 2 });
  });

  it('merges two objects in point free style', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    expect(merge(source)(target)).toEqual({ a: 1, b: 2 });
  });

  it('overwrites target properties with source properties', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3 };
    expect(merge(target, source)).toEqual({ a: 1, b: 3 });
  });
});
