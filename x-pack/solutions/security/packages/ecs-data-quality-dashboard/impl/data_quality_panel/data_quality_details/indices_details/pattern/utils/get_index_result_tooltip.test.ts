/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FAILED, PASSED, THIS_INDEX_HAS_NOT_BEEN_CHECKED } from '../translations';
import { getIndexResultToolTip } from './get_index_result_tooltip';

describe('getIndexResultToolTip', () => {
  test('it returns "this index has not been checked" when `incompatible` is undefined', () => {
    expect(getIndexResultToolTip(undefined)).toEqual(THIS_INDEX_HAS_NOT_BEEN_CHECKED);
  });

  test('it returns Passed when `incompatible` is zero', () => {
    expect(getIndexResultToolTip(0)).toEqual(PASSED);
  });

  test('it returns Failed when `incompatible` is NOT zero', () => {
    expect(getIndexResultToolTip(1)).toEqual(FAILED);
  });
});
