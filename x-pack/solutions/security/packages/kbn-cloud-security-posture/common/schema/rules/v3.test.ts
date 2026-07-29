/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findCspBenchmarkRuleRequestSchema } from './v3';

describe('rules v3 request schema', () => {
  it('accepts Fleet package policy IDs up to 255 characters and rejects longer IDs', () => {
    expect(() =>
      findCspBenchmarkRuleRequestSchema.validate({ packagePolicyId: 'a'.repeat(255) })
    ).not.toThrow();
    expect(() =>
      findCspBenchmarkRuleRequestSchema.validate({ packagePolicyId: 'a'.repeat(256) })
    ).toThrow();
  });
});
