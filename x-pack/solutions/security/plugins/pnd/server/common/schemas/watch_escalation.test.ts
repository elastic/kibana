/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { watchEscalationSchema } from './watch_escalation';

describe('watch_escalation schema (Floor -> Dark -> Deep seam contract)', () => {
  const valid = {
    fromWatch: 'watch-floor' as const,
    toWatch: 'watch-dark' as const,
    reason: 'Suspected phishing-delivered PowerShell execution on WKSTN-EVAL01.',
    confidence: 0.93,
    investigationId: 'inv-123',
    indicators: ['T1566', 'T1059.001'],
  };

  it('accepts a well-formed escalation payload', () => {
    expect(watchEscalationSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an empty investigationId (the bug #9 corruption target)', () => {
    expect(() => watchEscalationSchema.parse({ ...valid, investigationId: '' })).toThrow();
  });

  it('rejects a non-string (stringified-object) investigationId', () => {
    // "[object Object]" is technically a string; the real regression was a
    // MISSING id, so guard the structural cases the contract can catch:
    // wrong type must be rejected outright.
    expect(() =>
      watchEscalationSchema.parse({ ...valid, investigationId: { nested: true } })
    ).toThrow();
  });

  it('rejects an empty indicators array (an escalation must carry >= 1 indicator)', () => {
    expect(() => watchEscalationSchema.parse({ ...valid, indicators: [] })).toThrow();
  });

  it('rejects confidence outside 0..1', () => {
    expect(() => watchEscalationSchema.parse({ ...valid, confidence: 1.5 })).toThrow();
    expect(() => watchEscalationSchema.parse({ ...valid, confidence: -0.1 })).toThrow();
  });

  it('rejects an unknown watch tier', () => {
    expect(() => watchEscalationSchema.parse({ ...valid, toWatch: 'watch-unknown' })).toThrow();
  });

  it('rejects an empty reason string', () => {
    expect(() => watchEscalationSchema.parse({ ...valid, reason: '' })).toThrow();
  });

  it('accepts every valid tier as fromWatch/toWatch', () => {
    const tiers = ['watch-floor', 'watch-dark', 'watch-deep', 'watch-detection'] as const;
    for (const tier of tiers) {
      expect(() => watchEscalationSchema.parse({ ...valid, toWatch: tier })).not.toThrow();
      expect(() => watchEscalationSchema.parse({ ...valid, fromWatch: tier })).not.toThrow();
    }
  });
});
