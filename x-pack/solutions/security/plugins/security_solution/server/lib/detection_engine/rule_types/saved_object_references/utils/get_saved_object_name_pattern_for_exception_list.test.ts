/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME } from './constants';
import { getSavedObjectNamePatternForExceptionsList } from './get_saved_object_name_pattern_for_exception_list';

describe('get_saved_object_name_pattern_for_exception_list', () => {
  test('returns expected pattern given a zero', () => {
    expect(getSavedObjectNamePatternForExceptionsList(0)).toEqual(
      `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_0`
    );
  });

  test('returns expected pattern given a positive number', () => {
    expect(getSavedObjectNamePatternForExceptionsList(1)).toEqual(
      `${EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME}_1`
    );
  });

  test('throws given less than zero', () => {
    expect(() => getSavedObjectNamePatternForExceptionsList(-1)).toThrow(
      '"index" should alway be >= 0 instead of: -1'
    );
  });

  test('throws given NaN', () => {
    expect(() => getSavedObjectNamePatternForExceptionsList(NaN)).toThrow(
      '"index" should alway be >= 0 instead of: NaN'
    );
  });
});
