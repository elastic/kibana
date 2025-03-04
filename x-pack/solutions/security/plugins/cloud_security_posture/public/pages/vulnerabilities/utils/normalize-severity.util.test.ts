/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { normalizeSeverity } from './normalize-severity.util';

describe('normalizeSeverity', () => {
  it('should return the same severity if it is valid (case insensitive)', () => {
    expect(normalizeSeverity('low')).toBe('LOW');
    expect(normalizeSeverity('MEDIUM')).toBe('MEDIUM');
    expect(normalizeSeverity('High')).toBe('HIGH');
    expect(normalizeSeverity('critical')).toBe('CRITICAL');
    expect(normalizeSeverity('UNKNOWN')).toBe('UNKNOWN');
  });

  it('should return UNKNOWN for invalid severities', () => {
    expect(normalizeSeverity('invalid')).toBe('UNKNOWN');
    expect(normalizeSeverity('123')).toBe('UNKNOWN');
    expect(normalizeSeverity('')).toBe('UNKNOWN');
    expect(normalizeSeverity('low-high')).toBe('UNKNOWN');
    expect(normalizeSeverity('')).toBe('UNKNOWN');
  });

  it('should return UNKNOWN when severity is undefined', () => {
    expect(normalizeSeverity()).toBe('UNKNOWN');
  });
});
