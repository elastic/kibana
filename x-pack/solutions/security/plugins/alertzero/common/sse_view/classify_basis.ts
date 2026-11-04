/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Graded basis for why an SSE detection is a hit (plan D7). Matches the
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
 * `ip` IOC values inside loopback (127.0.0.0/8), private (10/8, 172.16/12,
 * 192.168/16), or link-local (169.254/16) ranges grade weak: an internal
 * address is shared by many hosts and is weak corroboration on its own.
 * Non-IPv4 and unparseable values are not graded weak here (IPv6 is treated
 * as strong, like every other IOC type).
 */
const isWeakIp = (value: string): boolean => {
  const octets = parseIpv4Octets(value);
  if (!octets) return false;
  const [a, b] = octets;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private class A
  if (a === 172 && b >= 16 && b <= 31) return true; // private class B
  if (a === 192 && b === 168) return true; // private class C
  if (a === 169 && b === 254) return true; // link-local
  return false;
};

/** Hash, public IP, domain, URL and email all grade strong; only a non-public `ip` grades weak. */
const isStrongIoc = (ioc: ClassifyBasisIoc): boolean =>
  ioc.type === 'ip' ? !isWeakIp(ioc.value) : true;

/**
 * Grades why an SSE detection is a hit (D7). `hasBehaviorHit` is whether a
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
