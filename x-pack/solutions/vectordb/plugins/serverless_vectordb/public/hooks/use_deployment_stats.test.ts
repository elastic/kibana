/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatBytes, formatNumber } from './use_deployment_stats';

describe('formatBytes', () => {
  it('returns the dash for null', () => {
    expect(formatBytes(null)).toBe('—');
  });

  it('returns "0 B" for zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes without a decimal', () => {
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
  });

  it('formats terabytes', () => {
    expect(formatBytes(1024 ** 4)).toBe('1.0 TB');
  });

  it('omits the decimal when the value is >= 100', () => {
    expect(formatBytes(1024 ** 3 * 100)).toBe('100 GB');
  });

  it('caps at terabytes for very large values', () => {
    const result = formatBytes(1024 ** 5);
    expect(result).toMatch(/TB$/);
  });
});

describe('formatNumber', () => {
  it('returns the dash for null', () => {
    expect(formatNumber(null)).toBe('—');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats a plain integer', () => {
    expect(formatNumber(42)).toBe('42');
  });

  it('formats a large number with thousands separators', () => {
    expect(formatNumber(1000000)).toBe(new Intl.NumberFormat().format(1000000));
  });
});
