/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPrimitive } from './is_primitive';

describe('is_primitives', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns false when an empty array is passed in', () => {
    expect(isPrimitive([])).toEqual(false);
  });

  /**
   * Simple table test of values of primitive values which should all pass
   */
  test.each([[null], [1], ['string'], [true], [Boolean('true')]])(
    'returns true when a primitive array of %o is passed in',
    (arrayValue) => {
      expect(isPrimitive(arrayValue)).toEqual(true);
    }
  );

  /**
   * Simple table test of values of objects which should not pass
   */
  test.each([[{}], [{ a: 1 }]])(
    'returns false when the array of %o contains an object is passed in',
    (arrayValue) => {
      expect(isPrimitive(arrayValue)).toEqual(false);
    }
  );
});
