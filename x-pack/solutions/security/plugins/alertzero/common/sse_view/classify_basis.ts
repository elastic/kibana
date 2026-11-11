/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Graded basis for why an SSE detection is a hit. Matches the
 * `basis` enum on `detectionSchema` in `significant_security_event_schema.ts`.
 */
export type SseBasis = 'ioc_strong' | 'ioc_weak' | 'behavior_only' | 'ioc_and_behavior';

/** Minimal IOC shape `classifyBasis` needs: a type to grade and the value to grade it on. */
export interface ClassifyBasisIoc {
  type: string;
  value: string;
}

const parseIpv4Octets = (value: string): number[] | undefined => {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value.trim());
  if (!match) return undefined;
  const octets = match.slice(1, 5).map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : undefined;
};

const IPV6_HEXTET_COUNT = 8;

/**
 * Expands an IPv6 literal to its eight 16-bit hextets, so equivalent spellings
 * (`::1` and `0:0:0:0:0:0:0:1`, `::ffff:10.0.0.1` and `::ffff:a00:1`, upper and
 * lower case, bracketed or not, with or without a `%zone` id) grade the same.
 * Returns undefined for anything that is not a well-formed IPv6 address.
 */
const parseIpv6Hextets = (value: string): number[] | undefined => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    // A scoped literal (`fe80::1%eth0`) names the same address; the zone is not part of it.
    .replace(/%[^%]*$/, '');
  if (!normalized.includes(':')) return undefined;

  // An embedded IPv4 tail (`::ffff:10.0.0.1`) is two hextets. The separator before it
  // is consumed here, except when it is the `::` gap itself (`::10.0.0.1`).
  let body = normalized;
  const tail: number[] = [];
  const embedded = /^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(normalized);
  if (embedded) {
    const octets = parseIpv4Octets(embedded[2]);
    if (!octets) return undefined;
    body = embedded[1].endsWith('::') ? embedded[1] : embedded[1].slice(0, -1);
    tail.push(octets[0] * 256 + octets[1], octets[2] * 256 + octets[3]);
  }

  const parseGroups = (part: string): number[] | undefined => {
    if (part === '') return [];
    const groups: number[] = [];
    for (const group of part.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(group)) return undefined;
      groups.push(parseInt(group, 16));
    }
    return groups;
  };

  const gap = body.indexOf('::');
  if (gap === -1) {
    const groups = parseGroups(body);
    if (!groups) return undefined;
    const hextets = [...groups, ...tail];
    return hextets.length === IPV6_HEXTET_COUNT ? hextets : undefined;
  }
  if (body.indexOf('::', gap + 1) !== -1) return undefined;
  const head = parseGroups(body.slice(0, gap));
  const rest = parseGroups(body.slice(gap + 2));
  if (!head || !rest) return undefined;
  const fill = IPV6_HEXTET_COUNT - head.length - rest.length - tail.length;
  if (fill < 1) return undefined;
  return [...head, ...new Array<number>(fill).fill(0), ...rest, ...tail];
};

/**
 * IPv6 ranges that never name one internet host: loopback / unspecified
 * (`::1`, `::`), unique-local (fc00::/7) and link-local (fe80::/10). Graded on
 * the expanded hextets, so every spelling of the same address grades alike; an
 * IPv4-mapped address (`::ffff:a.b.c.d`, or its hex form) is graded by its IPv4
 * part. Unparseable values are not graded weak.
 */
const isWeakIpv6 = (value: string): boolean => {
  const hextets = parseIpv6Hextets(value);
  if (!hextets) return false;
  const [first] = hextets;
  const leadingZero = hextets.slice(0, 5).every((hextet) => hextet === 0);
  if (leadingZero && hextets[5] === 0xffff) {
    const [high, low] = [hextets[6], hextets[7]];
    const ipv4 = `${Math.floor(high / 256)}.${high % 256}.${Math.floor(low / 256)}.${low % 256}`;
    return isWeakIpv4(ipv4);
  }
  if (leadingZero && hextets[5] === 0 && hextets[6] === 0 && hextets[7] <= 1) {
    return true; // unspecified (::) and loopback (::1)
  }
  if (first >= 0xfc00 && first <= 0xfdff) return true; // fc00::/7 unique-local
  if (first >= 0xfe80 && first <= 0xfebf) return true; // fe80::/10 link-local
  return false;
};

/**
 * `ip` IOC values that cannot single out one internet host grade weak: loopback
 * (127/8), "this network" (0/8), RFC 1918 private (10/8, 172.16/12, 192.168/16),
 * carrier-grade NAT (100.64/10), link-local (169.254/16), multicast (224/4) and
 * reserved / broadcast (240/4). An internal or shared address is weak
 * corroboration on its own. Unparseable values are not graded weak.
 */
const isWeakIpv4 = (value: string): boolean => {
  const octets = parseIpv4Octets(value);
  if (!octets) return false;
  const [a, b] = octets;
  if (a === 0) return true; // this network
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private class A
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 172 && b >= 16 && b <= 31) return true; // private class B
  if (a === 192 && b === 168) return true; // private class C
  if (a === 169 && b === 254) return true; // link-local
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
};

const isWeakIp = (value: string): boolean => isWeakIpv4(value) || isWeakIpv6(value);

/**
 * Canonical spelling of a well-formed IPv4 or IPv6 literal, in any spelling this
 * module grades: dotted decimal without leading zeros, or all eight lowercase
 * hextets with no `::` gap, brackets or zone id. Every result is a literal the
 * ES|QL `::ip` cast accepts; undefined when `value` is not an address.
 */
export const normalizeIpAddress = (value: string): string | undefined => {
  const octets = parseIpv4Octets(value);
  if (octets) return octets.join('.');
  const hextets = parseIpv6Hextets(value);
  return hextets?.map((hextet) => hextet.toString(16)).join(':');
};

/** Hash, public IP, domain, URL and email all grade strong; only a non-public `ip` grades weak. */
const isStrongIoc = (ioc: ClassifyBasisIoc): boolean =>
  ioc.type === 'ip' ? !isWeakIp(ioc.value) : true;

/**
 * Grades why an SSE detection is a hit. `hasBehaviorHit` is whether a
 * Tier 2 behavior executed and matched live activity; `iocs` are the IOCs
 * corroborating the same detection (or finding).
 *
 * With a behavior hit, any matching IOC (strong or weak) upgrades the basis
 * to `ioc_and_behavior`; no IOC at all leaves it `behavior_only`. Without a
 * behavior hit, one strong IOC is enough for `ioc_strong`; otherwise (only
 * weak IOCs, or none at all) it grades `ioc_weak`.
 */
export const classifyBasis = (
  iocs: readonly ClassifyBasisIoc[],
  hasBehaviorHit: boolean
): SseBasis => {
  if (hasBehaviorHit) {
    return iocs.length > 0 ? 'ioc_and_behavior' : 'behavior_only';
  }
  return iocs.some(isStrongIoc) ? 'ioc_strong' : 'ioc_weak';
};
