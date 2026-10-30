/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toHttpRequests } from './http_requests';

describe('toHttpRequests', () => {
  it('computes the share of failed requests', () => {
    expect(toHttpRequests(200, 50)).toEqual({ count: 200, failedCount: 50, failedRatio: 0.25 });
  });

  it('leaves the failed ratio empty without requests', () => {
    expect(toHttpRequests(0, 0)).toEqual({ count: 0, failedCount: 0, failedRatio: null });
  });
});
