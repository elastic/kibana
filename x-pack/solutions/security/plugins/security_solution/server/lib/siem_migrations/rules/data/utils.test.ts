/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isStringValidJSON } from './utils';

describe('isStringValidJSON', () => {
  it('should return true for valid JSON strings', () => {
    expect(isStringValidJSON('{"key": "value"}')).toBe(true);
    expect(isStringValidJSON('{"key": 123}')).toBe(true);
    expect(isStringValidJSON('{"key": true}')).toBe(true);
    expect(isStringValidJSON('{"key": null}')).toBe(true);
    expect(isStringValidJSON('[]')).toBe(true);
  });

  it('should return false for invalid JSON strings', () => {
    expect(isStringValidJSON('{key: "value"}')).toBe(false);
    expect(isStringValidJSON('Some Non JSON String')).toBe(false);
  });
});
