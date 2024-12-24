/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getShowPagination } from './get_show_pagination';

describe('getShowPagination', () => {
  test('it returns true when `totalItemCount` is greater than `minPageSize`', () => {
    expect(
      getShowPagination({
        minPageSize: 10,
        totalItemCount: 11,
      })
    ).toBe(true);
  });

  test('it returns false when `totalItemCount` equals `minPageSize`', () => {
    expect(
      getShowPagination({
        minPageSize: 10,
        totalItemCount: 10,
      })
    ).toBe(false);
  });

  test('it returns false when `totalItemCount` is less than `minPageSize`', () => {
    expect(
      getShowPagination({
        minPageSize: 10,
        totalItemCount: 9,
      })
    ).toBe(false);
  });
});
