/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { checkEmptyValue } from '.';
import { getField } from '../fields/index.mock';
import * as i18n from '../translations';

describe('check_empty_value', () => {
  test('returns no errors if no field has been selected', () => {
    const isValid = checkEmptyValue('', undefined, true, false);

    expect(isValid).toBeUndefined();
  });

  test('returns error string if user has touched a required input and left empty', () => {
    const isValid = checkEmptyValue(undefined, getField('@timestamp'), true, true);

    expect(isValid).toEqual(i18n.FIELD_REQUIRED_ERR);
  });

  test('returns no errors if required input is empty but user has not yet touched it', () => {
    const isValid = checkEmptyValue(undefined, getField('@timestamp'), true, false);

    expect(isValid).toBeUndefined();
  });

  test('returns no errors if user has touched an input that is not required and left empty', () => {
    const isValid = checkEmptyValue(undefined, getField('@timestamp'), false, true);

    expect(isValid).toBeUndefined();
  });

  test('returns no errors if user has touched an input that is not required and left empty string', () => {
    const isValid = checkEmptyValue('', getField('@timestamp'), false, true);

    expect(isValid).toBeUndefined();
  });

  test('returns null if input value is not empty string or undefined', () => {
    const isValid = checkEmptyValue('hellooo', getField('@timestamp'), false, true);

    expect(isValid).toBeNull();
  });
});
