/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SaveBodySchema } from './schemas';

const body = (allowedMonitorHosts?: unknown) => ({
  name: 'prod',
  config: {
    address: 'https://vault.example.com:8200',
    authMethod: 'token',
    allowedMonitorHosts,
  },
  secrets: { token: 't' },
});

describe('SaveBodySchema allowedMonitorHosts', () => {
  it.each([[undefined], [[]], [['api.example.com', '10.0.0.1', '2001:db8::1', 'localhost']]])(
    'accepts %j',
    (hosts) => {
      expect(() => SaveBodySchema.validate(body(hosts))).not.toThrow();
    }
  );

  it.each([
    ['a scheme', 'https://api.example.com'],
    ['a port', 'api.example.com:443'],
    ['a path', 'api.example.com/v1'],
    ['a wildcard', '*.example.com'],
    ['whitespace', ' api.example.com'],
    ['an empty host', ''],
    ['a malformed IPv6 address', '2001:db8::zz'],
    ['an IPv6 zone', 'fe80::1%eth0'],
    ['a non-ASCII name', 'exämple.com'],
  ])('rejects a host with %s', (_name, host) => {
    expect(() => SaveBodySchema.validate(body([host]))).toThrow(/host name or IP address/);
  });

  it('bounds the list', () => {
    const hosts = Array.from({ length: 101 }, (_, i) => `h${i}.example.com`);
    expect(() => SaveBodySchema.validate(body(hosts))).toThrow();
  });
});
