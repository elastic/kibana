/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectLikeOrArrayOfObjectLikes } from './is_objectlike_or_array_of_objectlikes';

describe('is_objectlike_or_array_of_objectlikes', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns false when an empty array is passed in', () => {
    expect(isObjectLikeOrArrayOfObjectLikes([])).toEqual(false);
  });

  test('returns false when an array of primitives are passed in', () => {
    expect(isObjectLikeOrArrayOfObjectLikes([null, 2, 'string', 5, undefined])).toEqual(false);
  });

  /**
   * Simple table test of values of primitive arrays which should all fail
   */
  test.each([
    [[null]],
    [[1]],
    [['string']],
    [['string', null, 5, false, String('hi'), Boolean(true), undefined]],
  ])('returns true when a primitive array of %o is passed in', (arrayValue) => {
    expect(isObjectLikeOrArrayOfObjectLikes(arrayValue)).toEqual(false);
  });

  /**
   * Simple table test of values of primitives which should all fail
   */
  test.each([[null], [1], ['string'], [null], [String('hi')], [Boolean(true)], [undefined]])(
    'returns true when a primitive array of %o is passed in',
    (arrayValue) => {
      expect(isObjectLikeOrArrayOfObjectLikes(arrayValue)).toEqual(false);
    }
  );

  /**
   * Simple table test of values of all array of objects which should pass
   */
  test.each([
    [[{}]],
    [[{ a: 1 }]],
    [[1, {}]],
    [[[], 'string']],
    [['string', null, 5, false, String('hi'), {}, Boolean(true), undefined]],
  ])('returns false when the array of %o contains an object is passed in', (arrayValue) => {
    expect(isObjectLikeOrArrayOfObjectLikes(arrayValue)).toEqual(true);
  });

  /**
   * Simple table test of objects which should pass
   */
  test.each([[{}], [{ a: 1 }]])(
    'returns false when the array of %o contains an object is passed in',
    (arrayValue) => {
      expect(isObjectLikeOrArrayOfObjectLikes(arrayValue)).toEqual(true);
    }
  );
});
