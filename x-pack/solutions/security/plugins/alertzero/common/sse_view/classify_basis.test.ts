/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyBasis } from './classify_basis';

describe('classifyBasis', () => {
  describe('IOC strength grading', () => {
    it('grades a loopback ip (127.0.0.1) as weak', () => {
      expect(classifyBasis([{ type: 'ip', value: '127.0.0.1' }], false)).toBe('ioc_weak');
    });

    it('grades a 10.x private ip as weak', () => {
      expect(classifyBasis([{ type: 'ip', value: '10.1.2.3' }], false)).toBe('ioc_weak');
    });

    it('grades a 172.16-172.31 private ip as weak', () => {
      expect(classifyBasis([{ type: 'ip', value: '172.20.0.1' }], false)).toBe('ioc_weak');
    });

    it('grades a 192.168.x private ip as weak', () => {
      expect(classifyBasis([{ type: 'ip', value: '192.168.1.1' }], false)).toBe('ioc_weak');
    });

    it('grades a 169.254.x link-local ip as weak', () => {
      expect(classifyBasis([{ type: 'ip', value: '169.254.1.1' }], false)).toBe('ioc_weak');
    });

    it('grades a public ip as strong', () => {
      expect(classifyBasis([{ type: 'ip', value: '203.0.113.5' }], false)).toBe('ioc_strong');
    });

    it.each([
      ['::1', 'loopback'],
      ['0:0:0:0:0:0:0:1', 'loopback, expanded'],
      ['[::1]', 'loopback, bracketed'],
      ['::', 'unspecified'],
      ['0:0:0:0:0:0:0:0', 'unspecified, expanded'],
      ['::ffff:10.0.0.1', 'IPv4-mapped private, dotted'],
      ['::ffff:a00:1', 'IPv4-mapped private, hex'],
      ['::FFFF:7F00:1', 'IPv4-mapped loopback, hex upper case'],
      ['fc00::1', 'unique-local'],
      ['FD12:3456::1', 'unique-local upper case'],
      ['fe80:0:0:0:1:2:3:4', 'link-local, expanded'],
      ['fe80::1%eth0', 'link-local with a zone id'],
      ['[fe80::1%25eth0]', 'link-local, bracketed with an escaped zone id'],
      ['0:0:0:0:0:ffff:10.0.0.1', 'IPv4-mapped private, expanded with a dotted tail'],
    ])('grades %s (%s) as weak regardless of spelling', (value) => {
      expect(classifyBasis([{ type: 'ip', value }], false)).toBe('ioc_weak');
    });

    it.each(['2001:db8::1', '2001:0db8:0000:0000:0000:0000:0000:0001', '::ffff:203.0.113.5'])(
      'grades public IPv6 %s as strong',
      (value) => {
        expect(classifyBasis([{ type: 'ip', value }], false)).toBe('ioc_strong');
      }
    );

    it.each(['fe80::1::2', '::ffff:999.0.0.1', '::1:', '0:0:0:0:0:0:0:1:', ':::1'])(
      'does not grade malformed IPv6 value %s as weak',
      (value) => {
        expect(classifyBasis([{ type: 'ip', value }], false)).toBe('ioc_strong');
      }
    );

    it('grades a domain as strong', () => {
      expect(classifyBasis([{ type: 'domain', value: 'evil.example.com' }], false)).toBe(
        'ioc_strong'
      );
    });

    it('grades a hash as strong', () => {
      expect(classifyBasis([{ type: 'hash', value: 'a'.repeat(64) }], false)).toBe('ioc_strong');
    });

    it('grades a url as strong', () => {
      expect(
        classifyBasis([{ type: 'url', value: 'https://evil.example.com/payload' }], false)
      ).toBe('ioc_strong');
    });
  });

  describe('no behavior hit', () => {
    it('returns ioc_strong when any IOC is strong', () => {
      expect(
        classifyBasis(
          [
            { type: 'ip', value: '10.1.2.3' },
            { type: 'domain', value: 'evil.example.com' },
          ],
          false
        )
      ).toBe('ioc_strong');
    });

    it('returns ioc_weak when every IOC is weak', () => {
      expect(
        classifyBasis(
          [
            { type: 'ip', value: '10.1.2.3' },
            { type: 'ip', value: '127.0.0.1' },
          ],
          false
        )
      ).toBe('ioc_weak');
    });

    it('returns ioc_weak when there are no IOCs at all', () => {
      expect(classifyBasis([], false)).toBe('ioc_weak');
    });
  });

  describe('with a behavior hit', () => {
    it('returns ioc_and_behavior when a strong IOC also matched', () => {
      expect(classifyBasis([{ type: 'domain', value: 'evil.example.com' }], true)).toBe(
        'ioc_and_behavior'
      );
    });

    it('returns ioc_and_behavior when only a weak IOC matched', () => {
      expect(classifyBasis([{ type: 'ip', value: '10.1.2.3' }], true)).toBe('ioc_and_behavior');
    });

    it('returns behavior_only when no IOC matched', () => {
      expect(classifyBasis([], true)).toBe('behavior_only');
    });
  });
});

describe('classifyBasis shared and non-routable ip ranges', () => {
  it.each([
    ['0.0.0.0', 'this network'],
    ['100.64.0.1', 'carrier-grade NAT'],
    ['100.127.255.254', 'carrier-grade NAT upper bound'],
    ['224.0.0.251', 'multicast'],
    ['239.255.255.250', 'multicast upper'],
    ['255.255.255.255', 'broadcast'],
    ['::1', 'IPv6 loopback'],
    ['::', 'IPv6 unspecified'],
    ['fd12:3456:789a::1', 'IPv6 unique-local'],
    ['FC00::1', 'IPv6 unique-local upper-case'],
    ['fe80::1', 'IPv6 link-local'],
    ['[fe80::1]', 'bracketed IPv6 link-local'],
    ['::ffff:10.0.0.1', 'IPv4-mapped private'],
  ])('grades %s (%s) as weak', (value) => {
    expect(classifyBasis([{ type: 'ip', value }], false)).toBe('ioc_weak');
  });

  it.each([
    ['100.63.255.255', 'just below carrier-grade NAT'],
    ['100.128.0.1', 'just above carrier-grade NAT'],
    ['223.255.255.255', 'last unicast address'],
    ['2001:db8::1', 'public IPv6'],
    ['::ffff:203.0.113.5', 'IPv4-mapped public'],
  ])('grades %s (%s) as strong', (value) => {
    expect(classifyBasis([{ type: 'ip', value }], false)).toBe('ioc_strong');
  });
});
