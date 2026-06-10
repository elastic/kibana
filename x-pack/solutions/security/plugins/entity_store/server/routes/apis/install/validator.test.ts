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
    expect(BodySchema.safeParse({ historySnapshot: { frequency: '1h' } }).success).toBe(true);
  });
});

describe('BodySchema strict / unknown keys', () => {
  it('rejects unknown key at top level', () => {
    const result = BodySchema.safeParse({ non_valid_property: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === 'unrecognized_keys')).toBe(true);
    }
  });

  it('rejects unknown key under logExtraction', () => {
    const result = BodySchema.safeParse({ logExtraction: { asasa: 123 } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === 'unrecognized_keys')).toBe(true);
    }
  });

  it('rejects unknown key under historySnapshot', () => {
    const result = BodySchema.safeParse({ historySnapshot: { foo: 'bar' } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === 'unrecognized_keys')).toBe(true);
    }
  });

  it('rejects combined unknown keys at top level and nested', () => {
    const result = BodySchema.safeParse({
      non_valid_property: 1,
      logExtraction: { asasa: 123 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === 'unrecognized_keys')).toBe(true);
    }
  });
});
