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

/**
 * IPv6 ranges that never name one internet host: loopback / unspecified
 * (`::1`, `::`), unique-local (fc00::/7) and link-local (fe80::/10). Compared on
 * the lowercased, bracket-stripped value; an IPv4-mapped form (`::ffff:a.b.c.d`)
 * is graded by its IPv4 part.
 */
const isWeakIpv6 = (value: string): boolean => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  if (!normalized.includes(':')) return false;
  if (normalized === '::1' || normalized === '::') return true;
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(normalized);
  if (mapped) return isWeakIpv4(mapped[1]);
  const firstHextet = normalized.split(':')[0];
  if (/^f[cd][0-9a-f]{0,2}$/.test(firstHextet)) return true; // fc00::/7 unique-local
  if (/^fe[89ab][0-9a-f]?$/.test(firstHextet)) return true; // fe80::/10 link-local
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
