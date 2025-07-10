/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotFoundError } from './utils';

describe('isNotFoundError', () => {
  it('should return true if message has key found with value false', () => {
    expect(isNotFoundError(new Error('{"key": "value", "found": false}'))).toBe(true);
  });

  it('should return false for invalid JSON strings', () => {
    expect(isNotFoundError(new Error('{key: "value"}'))).toBe(false);
    expect(isNotFoundError(new Error('Some Non JSON String'))).toBe(false);
  });

  it('should return false if message does not have key `found` or it is `true`', () => {
    expect(isNotFoundError(new Error('{"message": {key: "value", "found": true}}'))).toBe(false);
    expect(isNotFoundError(new Error('{"message": {key: "value"}}'))).toBe(false);
  });
});
