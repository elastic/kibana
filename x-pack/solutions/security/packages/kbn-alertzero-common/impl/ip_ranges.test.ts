/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonRoutableIpIoc, isNonRoutableIPv4, isNonRoutableIPv6 } from './ip_ranges';

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
    // Stored IOC values are not URL-normalised, so spelling variants must still match.
    ['loopback written out in full', '0:0:0:0:0:0:0:1'],
    ['loopback zero-padded', '0000:0000:0000:0000:0000:0000:0000:0001'],
    ['unspecified written out in full', '0:0:0:0:0:0:0:0'],
    ['bracketed loopback', '[::1]'],
    ['uppercase link-local', 'FE80::1'],
    ['link-local with zone id', 'fe80::1%eth0'],
    ['IPv4-mapped metadata written out in full', '0:0:0:0:0:ffff:a9fe:a9fe'],
    ['IPv4-mapped dotted metadata written out in full', '0:0:0:0:0:ffff:169.254.169.254'],
    ['6to4 written out in full', '2002:0:0:0:0:0:0:0'],
    // URL syntax in the value must not parse into a different host and flip the answer.
    ['link-local with URL userinfo naming a public host', 'fe80::1]:80@[2606::1'],
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

  it('leaves a public address routable when written out in full or bracketed', () => {
    expect(isNonRoutableIPv6('2606:4700:4700:0:0:0:0:1111')).toBe(false);
    expect(isNonRoutableIPv6('[2606:4700:4700::1111]')).toBe(false);
  });
});

describe('isNonRoutableIpIoc', () => {
  it('returns false for non-ip types', () => {
    expect(isNonRoutableIpIoc({ type: 'domain', value: '127.0.0.1' })).toBe(false);
    expect(isNonRoutableIpIoc({ type: 'hash', value: 'a'.repeat(64) })).toBe(false);
  });

  it('returns false for a missing, blank, or non-string value', () => {
    expect(isNonRoutableIpIoc({ type: 'ip' })).toBe(false);
    expect(isNonRoutableIpIoc({ type: 'ip', value: '   ' })).toBe(false);
    expect(isNonRoutableIpIoc({ type: 'ip', value: 127 })).toBe(false);
  });

  it('judges a CIDR by its network address', () => {
    expect(isNonRoutableIpIoc({ type: 'cidr', value: '10.20.0.0/16' })).toBe(true);
    expect(isNonRoutableIpIoc({ type: 'cidr', value: '203.0.113.0/24' })).toBe(false);
  });

  it('classifies bare IPv4 and IPv6 values', () => {
    expect(isNonRoutableIpIoc({ type: 'ip', value: '100.64.0.7' })).toBe(true);
    expect(isNonRoutableIpIoc({ type: 'ip', value: '::1' })).toBe(true);
    expect(isNonRoutableIpIoc({ type: 'ip', value: '203.0.113.10' })).toBe(false);
  });

  it.each([
    ['ip typed with a CIDR suffix', { type: 'ip', value: '127.0.0.1/32' }],
    ['ip typed with a port', { type: 'ip', value: '127.0.0.1:443' }],
    ['private ip typed with a CIDR suffix', { type: 'ip', value: '10.0.0.5/32' }],
    ['bracketed IPv6 with a port', { type: 'ip', value: '[::1]:80' }],
    ['bracketed link-local with a port', { type: 'ip', value: '[fe80::1]:8080' }],
    // Trailing junk must not hide the address: a full-string-anchored unwrap missed these.
    ['bracketed loopback with trailing junk', { type: 'ip', value: '[::1]trailing' }],
    ['loopback port with trailing junk', { type: 'ip', value: '127.0.0.1:443junk' }],
    ['private ip with trailing junk', { type: 'ip', value: '10.0.0.5extra' }],
    [
      'bracketed link-local with URL junk after the port',
      { type: 'ip', value: '[fe80::1]:80@[2606::1]' },
    ],
  ])('still flags %s when the stored spelling is not a bare address', (_label, ioc) => {
    expect(isNonRoutableIpIoc(ioc)).toBe(true);
  });

  it('leaves a public IPv4 with a port routable', () => {
    expect(isNonRoutableIpIoc({ type: 'ip', value: '203.0.113.10:443' })).toBe(false);
  });

  it.each(['203.0.113.1000', '203.0.113.256', '999.0.0.1', '127.0.0.1000', '10.0.0.5000'])(
    'does not read out-of-range octets in %s as an address',
    (value) => {
      expect(isNonRoutableIpIoc({ type: 'ip', value })).toBe(false);
    }
  );

  it('leaves a public IPv4 with trailing junk routable', () => {
    expect(isNonRoutableIpIoc({ type: 'ip', value: '203.0.113.10:443junk' })).toBe(false);
  });
});
