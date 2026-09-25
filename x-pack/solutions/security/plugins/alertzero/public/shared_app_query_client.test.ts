/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSharedAppQueryClient } from './shared_app_query_client';

describe('getSharedAppQueryClient', () => {
  it('returns the same instance on every call, so the queue page and the flyout share one cache', async () => {
    const [first, second] = await Promise.all([
      getSharedAppQueryClient(),
      getSharedAppQueryClient(),
    ]);
    expect(first).toBe(second);
  });
});
