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
    expect(getNormalizedSeverity('MEDIUM')).toBe('MEDIUM');
    expect(getNormalizedSeverity('High')).toBe('HIGH');
    expect(getNormalizedSeverity('critical')).toBe('CRITICAL');
    expect(getNormalizedSeverity('UNKNOWN')).toBe('UNKNOWN');
  });

  it('should return UNKNOWN for invalid severities', () => {
    expect(getNormalizedSeverity('invalid')).toBe('UNKNOWN');
    expect(getNormalizedSeverity('123')).toBe('UNKNOWN');
    expect(getNormalizedSeverity('')).toBe('UNKNOWN');
    expect(getNormalizedSeverity('low-high')).toBe('UNKNOWN');
    expect(getNormalizedSeverity('')).toBe('UNKNOWN');
  });

  it('should return UNKNOWN when severity is undefined', () => {
    expect(getNormalizedSeverity()).toBe('UNKNOWN');
  });
});
