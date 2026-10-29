/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAllowedMonitorHostShape,
  isNarrowerOrEqualHostList,
  normalizeAllowedMonitorHost,
} from './allowed_monitor_hosts';

describe('allowed monitor hosts', () => {
  it.each([
    'api.example.com',
    'API.Example.COM',
    'localhost',
    'my_host.internal.',
    '10.0.0.1',
    '2001:db8::1',
    '::1',
  ])('accepts %s', (host) => {
    expect(isAllowedMonitorHostShape(host)).toBe(true);
  });

  it.each([
    '',
    ' api.example.com',
    'api.example.com ',
    'https://api.example.com',
    'api.example.com:443',
    'api.example.com/path',
    '*.example.com',
    'user@example.com',
    '[::1]',
    'exämple.com',
    '-bad.example.com',
    `${'a'.repeat(254)}`,
  ])('rejects %j', (host) => {
    expect(isAllowedMonitorHostShape(host)).toBe(false);
  });

  it('normalizes like Heartbeat compares hosts', () => {
    expect(normalizeAllowedMonitorHost(' API.Example.com. ')).toBe('api.example.com');
  });

  describe('isNarrowerOrEqualHostList', () => {
    it('allows anything when there was no restriction', () => {
      expect(isNarrowerOrEqualHostList(undefined, ['a.example.com'])).toBe(true);
      expect(isNarrowerOrEqualHostList([], undefined)).toBe(true);
    });

    it('treats removing the restriction as widening', () => {
      expect(isNarrowerOrEqualHostList(['a.example.com'], undefined)).toBe(false);
      expect(isNarrowerOrEqualHostList(['a.example.com'], [])).toBe(false);
    });

    it('treats a subset, ignoring case and a trailing dot, as not widening', () => {
      expect(
        isNarrowerOrEqualHostList(['a.example.com', 'b.example.com'], ['A.example.com.'])
      ).toBe(true);
    });

    it('treats a new host as widening', () => {
      expect(isNarrowerOrEqualHostList(['a.example.com'], ['a.example.com', 'c.example.com'])).toBe(
        false
      );
    });
  });
});
