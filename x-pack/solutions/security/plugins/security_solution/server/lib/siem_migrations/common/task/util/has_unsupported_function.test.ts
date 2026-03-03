/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasUnsupportedFunctions, UNSUPPORTED_FUNCTIONS } from './has_unsupported_function';

describe('hasUnsupportedFunctions', () => {
  it.each(UNSUPPORTED_FUNCTIONS)(
    'should return true when the query contains unsupported function: %s',
    (func) => {
      expect(hasUnsupportedFunctions(`some query with ${func} in it`)).toBe(true);
    }
  );

  it('should return false when the query contains no unsupported functions', () => {
    expect(hasUnsupportedFunctions('SELECT * FROM events WHERE severity > 5')).toBe(false);
  });

  it('should return false for an empty string', () => {
    expect(hasUnsupportedFunctions('')).toBe(false);
  });
});
