/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findCspBenchmarkRuleRequestSchema } from './v5';

describe('rules v5 request schema', () => {
  it('accepts rule numbers up to 64 characters and rejects longer values', () => {
    expect(() =>
      findCspBenchmarkRuleRequestSchema.validate({ ruleNumber: '1'.repeat(64) })
    ).not.toThrow();
    expect(() =>
      findCspBenchmarkRuleRequestSchema.validate({ ruleNumber: '1'.repeat(65) })
    ).toThrow();
  });
});
