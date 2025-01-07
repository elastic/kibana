/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInvalidKey } from './is_invalid_key';

describe('matches_invalid_key', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it returns true if a value is a single dot', () => {
    expect(isInvalidKey('.')).toEqual(true);
  });

  test('it returns true if a value starts with a dot', () => {
    expect(isInvalidKey('.invalidName')).toEqual(true);
  });

  test('it returns true if a value is 2 dots', () => {
    expect(isInvalidKey('..')).toEqual(true);
  });

  test('it returns true if a value is 3 dots', () => {
    expect(isInvalidKey('...')).toEqual(true);
  });

  test('it returns true if a value has two dots in its name', () => {
    expect(isInvalidKey('host..name')).toEqual(true);
  });

  test('it returns false if a value has a single dot', () => {
    expect(isInvalidKey('host.name')).toEqual(false);
  });

  test('it returns false if a value is a regular path', () => {
    expect(isInvalidKey('a.b.c.d')).toEqual(false);
  });

  /** Yes, this is a valid key in elastic */
  test('it returns false if a value ends with a dot', () => {
    expect(isInvalidKey('validName.')).toEqual(false);
  });
});
