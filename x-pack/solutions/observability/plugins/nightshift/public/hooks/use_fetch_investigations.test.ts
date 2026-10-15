/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInvestigationsNextPageParam } from './use_fetch_investigations';

const page = (pageNumber: number, total: number) => ({
  results: [],
  pagination: { page: pageNumber, per_page: 10, total },
});

describe('getInvestigationsNextPageParam', () => {
  it('asks for the next page while the list has more', () => {
    expect(getInvestigationsNextPageParam(page(1, 25))).toBe(2);
    expect(getInvestigationsNextPageParam(page(3, 25))).toBeUndefined();
  });

  it('stops at the furthest page the shared list API reaches', () => {
    expect(getInvestigationsNextPageParam(page(99, 1000))).toBe(100);
    expect(getInvestigationsNextPageParam(page(100, 1000))).toBeUndefined();
  });
});
