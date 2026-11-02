/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getComplianceDashboardQuerySchema } from './stats';

describe('compliance dashboard query schema', () => {
  it('accepts Fleet namespaces up to 100 bytes and rejects longer namespaces', () => {
    expect(() =>
      getComplianceDashboardQuerySchema.validate({ namespace: 'a'.repeat(100) })
    ).not.toThrow();
    expect(() =>
      getComplianceDashboardQuerySchema.validate({ namespace: 'a'.repeat(101) })
    ).toThrow();
    expect(() =>
      getComplianceDashboardQuerySchema.validate({ namespace: '😀'.repeat(26) })
    ).toThrow();
  });
});
