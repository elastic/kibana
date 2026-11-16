/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonRoutableIPv4, isNonRoutableIPv6 } from '../ip_ranges';

/**
 * Which stored report IOCs a hunt may search.
 *
 * Mirrors the promote task's promotable tiers and `deferred_unreviewed` skip
 * (`security_solution` `promote_threat_indicators`): `discriminating`,
 * `contextual`, and `uncertain` are eligible; `reference` and `denied` are not.
 * A missing tier (`undefined` / `null` / `''`) means the IOC was never
 * adjudicated (seeded and legacy report docs) and stays hunt-eligible unless the
 * value itself is non-routable. That deliberately differs from promote, which
 * requires a known promotable tier. Anything with `deferred_unreviewed: true` is
 * excluded until a later enrich reviews it.
 *
 * Non-routable `ip` / `cidr` values (loopback, RFC1918, CGNAT, link-local, and
 * the shared special-use set) are never hunt-eligible, even when a legacy doc
 * lacks a tier or still carries a promotable one. extract_iocs already tiers
 * them `reference`/`private_ip` for new reports; this value check covers
 * reports extracted before that classification existed.
 */
export const HUNT_ELIGIBLE_IOC_TIERS = ['discriminating', 'contextual', 'uncertain'] as const;

export type HuntEligibleIocTier = (typeof HUNT_ELIGIBLE_IOC_TIERS)[number];

const IPV4_DOTTED = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/**
 * True when an `ip` or `cidr` IOC value sits in non-routable space and must not
 * be hunted, regardless of stored tier.
 */
export const isNonRoutableHuntIoc = (ioc: { type?: unknown; value?: unknown }): boolean => {
  if (typeof ioc.value !== 'string' || (ioc.type !== 'ip' && ioc.type !== 'cidr')) {
    return false;
  }
  const raw = ioc.value.trim();
  if (raw.length === 0) {
    return false;
  }
  const slash = raw.indexOf('/');
  const host = ioc.type === 'cidr' && slash !== -1 ? raw.slice(0, slash) : raw;
  if (IPV4_DOTTED.test(host)) {
    return isNonRoutableIPv4(host);
  }
  if (host.includes(':')) {
    return isNonRoutableIPv6(host);
  }
  return false;
};

export const isHuntEligibleIoc = (ioc: {
  type?: unknown;
  value?: unknown;
  tier?: unknown;
  deferred_unreviewed?: unknown;
}): boolean => {
  if (ioc.deferred_unreviewed === true) {
    return false;
  }
  if (isNonRoutableHuntIoc(ioc)) {
    return false;
  }
  if (ioc.tier === undefined || ioc.tier === null || ioc.tier === '') {
    return true;
  }
  return (
    typeof ioc.tier === 'string' &&
    (HUNT_ELIGIBLE_IOC_TIERS as readonly string[]).includes(ioc.tier)
  );
};
