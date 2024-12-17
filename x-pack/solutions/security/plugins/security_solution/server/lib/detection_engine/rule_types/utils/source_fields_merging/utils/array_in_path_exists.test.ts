/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { arrayInPathExists } from './array_in_path_exists';

describe('array_in_path_exists', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns false when empty string and empty object', () => {
    expect(arrayInPathExists('', {})).toEqual(false);
  });

  test('returns false when a path and empty object', () => {
    expect(arrayInPathExists('a.b.c', {})).toEqual(false);
  });

  test('returns true when a path and an array exists', () => {
    expect(arrayInPathExists('a', { a: [] })).toEqual(true);
  });

  test('returns true when a path and an array exists within the parent path at level 1', () => {
    expect(arrayInPathExists('a.b', { a: [] })).toEqual(true);
  });

  test('returns true when a path and an array exists within the parent path at level 3', () => {
    expect(arrayInPathExists('a.b.c', { a: [] })).toEqual(true);
  });

  test('returns true when a path and an array exists within the parent path at level 2', () => {
    expect(arrayInPathExists('a.b.c', { a: { b: [] } })).toEqual(true);
  });
});
