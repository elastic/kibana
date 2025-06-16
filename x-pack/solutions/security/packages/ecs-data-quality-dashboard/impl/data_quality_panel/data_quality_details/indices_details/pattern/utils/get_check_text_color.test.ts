/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCheckTextColor } from './get_check_text_color';

describe('getCheckTextColor', () => {
  test('it returns `ghost` when `incompatible` is undefined', () => {
    expect(getCheckTextColor(undefined)).toEqual('ghost');
  });

  test('it returns `success` when `incompatible` is zero', () => {
    expect(getCheckTextColor(0)).toEqual('#6dcbb1');
  });

  test('it returns `danger` when `incompatible` is NOT zero', () => {
    expect(getCheckTextColor(1)).toEqual('danger');
  });
});
