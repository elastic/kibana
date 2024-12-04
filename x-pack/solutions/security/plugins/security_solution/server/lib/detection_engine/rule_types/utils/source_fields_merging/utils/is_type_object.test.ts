/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTypeObject } from './is_type_object';

describe('is_type_object', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns false when an empty array is passed in', () => {
    expect(isTypeObject([])).toEqual(false);
  });

  test('returns true when a type object is in the array', () => {
    expect(isTypeObject([{ type: 'Point' }])).toEqual(true);
  });

  test('returns false when a type object is not in the array', () => {
    expect(isTypeObject([{ foo: 'a' }])).toEqual(false);
  });

  test('returns false when a primitive is passed in', () => {
    expect(isTypeObject(['string'])).toEqual(false);
  });
});
