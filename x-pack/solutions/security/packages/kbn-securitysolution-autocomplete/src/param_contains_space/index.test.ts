/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramContainsSpace } from '.';

describe('param_contains_space', () => {
  test('should return true if leading spaces were found', () => {
    expect(paramContainsSpace('  test')).toBeTruthy();
  });
  test('should return true if trailing spaces were found', () => {
    expect(paramContainsSpace('test  ')).toBeTruthy();
  });
  test('should return true if both trailing and leading spaces were found', () => {
    expect(paramContainsSpace('  test  ')).toBeTruthy();
  });
  test('should return true if tabs was found', () => {
    expect(paramContainsSpace('\ttest')).toBeTruthy();
  });
  test('should return false if no spaces were found', () => {
    expect(paramContainsSpace('test test')).toBeFalsy();
  });
  test('should return false if param is falsy', () => {
    expect(paramContainsSpace('')).toBeFalsy();
  });
});
