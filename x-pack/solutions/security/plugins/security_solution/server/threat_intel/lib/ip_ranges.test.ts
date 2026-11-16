/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonRoutableIPv4, isNonRoutableIPv6 } from './ip_ranges';

/**
 * Smoke that the re-export still resolves. Full range coverage lives in
 * `@kbn/alertzero-common` `impl/ip_ranges.test.ts`.
 */
describe('ip_ranges re-export', () => {
  it('exposes isNonRoutableIPv4', () => {
    expect(isNonRoutableIPv4('127.0.0.1')).toBe(true);
    expect(isNonRoutableIPv4('93.184.216.34')).toBe(false);
  });

  it('exposes isNonRoutableIPv6', () => {
    expect(isNonRoutableIPv6('::1')).toBe(true);
    expect(isNonRoutableIPv6('2606:4700:4700::1111')).toBe(false);
  });
});
