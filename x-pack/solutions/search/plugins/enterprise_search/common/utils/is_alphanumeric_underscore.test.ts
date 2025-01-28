/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlphaNumericOrUnderscore } from './is_alphanumeric_underscore';

describe('isAlphanumericUnderscore', () => {
  it('should return true for valid inputs', () => {
    expect(isAlphaNumericOrUnderscore('test')).toBe(true);
    expect(isAlphaNumericOrUnderscore('test_one')).toBe(true);
  });

  it('should return false for invalid inputs', () => {
    expect(isAlphaNumericOrUnderscore('')).toBe(false);
    expect(isAlphaNumericOrUnderscore('test!')).toBe(false);
    expect(isAlphaNumericOrUnderscore('testç')).toBe(false);
    expect(isAlphaNumericOrUnderscore('test_one-s')).toBe(false);
  });
});
