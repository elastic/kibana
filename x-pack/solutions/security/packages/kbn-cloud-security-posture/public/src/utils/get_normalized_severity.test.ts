/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNormalizedSeverity } from './get_normalized_severity';

describe('getNormalizedSeverity', () => {
  it('should return the same severity if it is valid (case insensitive)', () => {
    expect(getNormalizedSeverity('low')).toBe('LOW');
    expect(getNormalizedSeverity('LOW')).toBe('LOW');
    expect(getNormalizedSeverity('medium')).toBe('MEDIUM');
    expect(getNormalizedSeverity('MEDIUM')).toBe('MEDIUM');
    expect(getNormalizedSeverity('High')).toBe('HIGH');
    expect(getNormalizedSeverity('HIGH')).toBe('HIGH');
    expect(getNormalizedSeverity('critical')).toBe('CRITICAL');
    expect(getNormalizedSeverity('CRITICAL')).toBe('CRITICAL');
    expect(getNormalizedSeverity('UNKNOWN')).toBe('UNKNOWN');
  });

  it('should return same value for invalid severities', () => {
    expect(getNormalizedSeverity('invalid')).toBe('invalid');
    expect(getNormalizedSeverity('123')).toBe('123');
    expect(getNormalizedSeverity('')).toBe('');
    expect(getNormalizedSeverity()).toBe(undefined);
  });
});
