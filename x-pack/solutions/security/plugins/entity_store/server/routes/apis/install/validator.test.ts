/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BodySchema } from './validator';

describe('BodySchema historySnapshot', () => {
  it('accepts valid frequency', () => {
    expect(BodySchema.safeParse({ historySnapshot: { frequency: '24h' } }).success).toBe(true);
    expect(BodySchema.safeParse({ historySnapshot: { frequency: '2h' } }).success).toBe(true);
    expect(BodySchema.safeParse({ historySnapshot: { frequency: '1h' } }).success).toBe(true);
  });

  it('rejects frequency less than 1h', () => {
    const result = BodySchema.safeParse({ historySnapshot: { frequency: '30m' } });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => typeof i.message === 'string' && i.message.includes('1 hour')
      );
      expect(issue).toBeDefined();
    }
  });

  it('rejects invalid frequency format', () => {
    const result = BodySchema.safeParse({ historySnapshot: { frequency: 'invalid' } });
    expect(result.success).toBe(false);
  });

  it('accepts empty body (only entityTypes and logExtraction optional)', () => {
    expect(BodySchema.safeParse({}).success).toBe(true);
    expect(BodySchema.safeParse({ entityTypes: ['host'] }).success).toBe(true);
    expect(BodySchema.safeParse({ logExtraction: { lookbackPeriod: '12h' } }).success).toBe(true);
  });
});
