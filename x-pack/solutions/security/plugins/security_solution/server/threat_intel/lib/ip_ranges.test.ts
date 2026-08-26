/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonRoutableIPv4, isNonRoutableIPv6 } from './ip_ranges';

describe('isNonRoutableIPv4', () => {
  it.each([
    ['loopback', '127.0.0.1'],
    ['loopback high octet', '127.0.0.99'],
    ['link-local metadata', '169.254.169.254'],
    ['private 10/8', '10.0.0.1'],
    ['private 172.16/12 low', '172.16.0.1'],
    ['private 172.16/12 high', '172.31.255.255'],
    ['private 192.168/16', '192.168.1.1'],
    ['this network', '0.0.0.0'],
    ['this network non-zero host', '0.0.0.1'],
    ['CGNAT low', '100.64.0.1'],
    ['CGNAT high', '100.127.255.255'],
    ['IETF protocol assignments', '192.0.0.1'],
    ['benchmarking 198.18/15 low', '198.18.0.1'],
    ['benchmarking 198.18/15 high', '198.19.0.1'],
    ['multicast', '239.255.255.250'],
    ['reserved', '240.0.0.1'],
  ])('treats %s as non-routable', (_label, ip) => {
    expect(isNonRoutableIPv4(ip)).toBe(true);
  });

  it.each([
    ['public 172 space below the private block', '172.15.0.1'],
    ['public 172 space above the private block', '172.32.0.1'],
    ['just below CGNAT', '100.63.255.255'],
    ['just above CGNAT', '100.128.0.1'],
    ['public 192 space', '192.0.1.1'],
    ['public 198 space', '198.20.0.1'],
    ['ordinary public address', '93.184.216.34'],
    ['just below multicast', '223.255.255.255'],
  ])('treats %s as routable', (_label, ip) => {
    expect(isNonRoutableIPv4(ip)).toBe(false);
  });
});

describe('isNonRoutableIPv6', () => {
  it.each([
    ['loopback', '::1'],
    ['unspecified', '::'],
    ['link-local', 'fe80::1'],
    ['unique-local fc', 'fc00::1'],
    ['unique-local fd', 'fd00::1'],
    ['IPv4-mapped dotted', '::ffff:169.254.169.254'],
    ['IPv4-mapped hex groups', '::ffff:a9fe:a9fe'],
    ['IPv4-compatible dotted', '::169.254.169.254'],
  ])('treats %s as non-routable', (_label, ip) => {
    expect(isNonRoutableIPv6(ip)).toBe(true);
  });

  it('treats an ordinary global unicast address as routable', () => {
    expect(isNonRoutableIPv6('2606:4700:4700::1111')).toBe(false);
  });

  it('maps a public IPv4 through the mapped form without flagging it', () => {
    expect(isNonRoutableIPv6('::ffff:93.184.216.34')).toBe(false);
  });
});
