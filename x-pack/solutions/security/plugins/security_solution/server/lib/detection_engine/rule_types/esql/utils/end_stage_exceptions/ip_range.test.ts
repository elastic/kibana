/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toIpRange } from './ip_range';

describe('toIpRange', () => {
  it.each([
    ['10.0.0.0/24', '10.0.0.0', '10.0.0.255'],
    ['10.0.0.77/24', '10.0.0.0', '10.0.0.255'],
    ['10.0.0.5/32', '10.0.0.5', '10.0.0.5'],
    ['10.0.0.4/31', '10.0.0.4', '10.0.0.5'],
    ['10.0.0.0/8', '10.0.0.0', '10.255.255.255'],
    ['0.0.0.0/0', '0.0.0.0', '255.255.255.255'],
    ['255.255.255.255/32', '255.255.255.255', '255.255.255.255'],
  ])('gives the first and the last address of the IPv4 value %s', (value, first, last) => {
    expect(toIpRange(value)).toEqual({ first, last });
  });

  it.each([
    ['2001:db8::/32', '2001:db8:0:0:0:0:0:0', '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff'],
    ['2001:DB8::/32', '2001:db8:0:0:0:0:0:0', '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff'],
    ['2001:db8:0:0:0:0:0:0/32', '2001:db8:0:0:0:0:0:0', '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff'],
    ['2001:db8::5/48', '2001:db8:0:0:0:0:0:0', '2001:db8:0:ffff:ffff:ffff:ffff:ffff'],
    ['2001:db8::1/128', '2001:db8:0:0:0:0:0:1', '2001:db8:0:0:0:0:0:1'],
    ['::1/128', '0:0:0:0:0:0:0:1', '0:0:0:0:0:0:0:1'],
    ['fe80::/10', 'fe80:0:0:0:0:0:0:0', 'febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
  ])('gives the first and the last address of the IPv6 value %s', (value, first, last) => {
    expect(toIpRange(value)).toEqual({ first, last });
  });

  it.each([
    '10.0.0.0',
    '10.0.0.0/33',
    '10.0.0.0/',
    '10.0.0.0/-1',
    '10.0.0.0/24/8',
    '10.0.0.0/024a',
    'x/24',
    '/24',
    '2001:db8::/129',
    '::/0',
    '::ffff:10.0.0.0/104',
  ])('does not accept %s', (value) => {
    expect(toIpRange(value)).toBeUndefined();
  });
});
