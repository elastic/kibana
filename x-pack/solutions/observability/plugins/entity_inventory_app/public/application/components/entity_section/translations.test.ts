/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityCountValue } from './translations';

describe('getEntityCountValue', () => {
  it('formats the count of a full list with thousands separators', () => {
    expect(getEntityCountValue({ count: 1234, truncated: false })).toBe('1,234');
  });

  it('formats the count of a truncated list with thousands separators and a plus', () => {
    expect(getEntityCountValue({ count: 9999, truncated: true })).toBe('9,999+');
  });
});
