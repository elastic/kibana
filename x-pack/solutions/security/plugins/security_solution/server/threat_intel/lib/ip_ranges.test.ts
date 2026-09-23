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
    // Not in any RFC special-use range: ordinary public space that Azure routes only
    // inside the VM, so every other rule passes it. It answers VM-scoped platform
    // requests, and the fetch client lets a caller supply arbitrary headers.
    ['Azure platform VIP', '168.63.129.16'],
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
    // The Azure platform /32 has to be caught through the mapped form too, or the
    // literal-only fix would be bypassable with an IPv6 spelling.
    ['Azure platform VIP via IPv4-mapped hex', '::ffff:a83f:8110'],
    // The IPv4-translatable / SIIT spelling. A literal host skips DNS validation, so a
    // miss here reaches the embedded target directly rather than being caught later.
    ['IPv4-translatable link-local (SIIT)', '::ffff:0:a9fe:a9fe'],
    ['IPv4-translatable loopback (SIIT)', '::ffff:0:7f00:1'],
    ['IPv4-translatable dotted', '::ffff:0:169.254.169.254'],
    ['Azure platform VIP via IPv4-mapped dotted', '::ffff:168.63.129.16'],
    ['site-local fec0::/10', 'fec0::1'],
    ['site-local top of range', 'feff::1'],
    ['multicast ff00::/8', 'ff02::1'],
    // 6to4 and NAT64 can carry a restricted IPv4 inside a public-looking literal.
    ['6to4 carrying link-local IPv4', '2002:a9fe:a9fe::1'],
    ['6to4 with the embedded address compressed away', '2002::'],
    ['NAT64 well-known prefix', '64:ff9b::a9fe:a9fe'],
    ['NAT64 local-use prefix', '64:ff9b:1::a9fe:a9fe'],
    ['discard-only 100::/64', '100::1'],
    ['documentation 2001:db8::/32', '2001:db8::1'],
    ['benchmarking 2001:2::/48, third group compressed', '2001:2::1'],
    ['benchmarking 2001:2::/48, third group explicit', '2001:2:0:0:0:0:0:1'],
  ])('treats %s as non-routable', (_label, ip) => {
    expect(isNonRoutableIPv6(ip)).toBe(true);
  });

  it.each([
    // The prefix tests must not swallow neighbouring public space.
    ['2001:2000::1 sits outside benchmarking 2001:2::/48', '2001:2000::1'],
    ['2003::1 sits outside 6to4 2002::/16', '2003::1'],
    ['65:ff9b::1 sits outside the NAT64 prefix', '65:ff9b::1'],
    ['fe7f::1 sits below link-local fe80::/10', 'fe7f::1'],
    ['routable: 2001:2:1::1 is outside benchmarking /48', '2001:2:1::1'],
  ])('%s', (_label, ip) => {
    expect(isNonRoutableIPv6(ip)).toBe(false);
  });

  it('treats an ordinary global unicast address as routable', () => {
    expect(isNonRoutableIPv6('2606:4700:4700::1111')).toBe(false);
  });

  it('leaves a public IPv4 in the translatable form routable', () => {
    expect(isNonRoutableIPv6('::ffff:0:5db8:d822')).toBe(false);
  });

  it('maps a public IPv4 through the mapped form without flagging it', () => {
    expect(isNonRoutableIPv6('::ffff:93.184.216.34')).toBe(false);
  });
});
