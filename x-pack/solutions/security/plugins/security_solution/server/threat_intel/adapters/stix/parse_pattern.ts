/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import net from 'node:net';
import type { IocType } from '../../../../common/threat_intel';
import type { ExtractedIoc, IocTier } from '../../services/extract_iocs';
import { isNonRoutableIPv4, isNonRoutableIPv6 } from '../../lib/ip_ranges';

/**
 * Pattern dialects that are not observable patterns — skip them entirely.
 * STIX (or unspecified → assumed stix) is the only parseable dialect here.
 */
const NON_STIX_DIALECTS = new Set([
  'yara',
  'snort',
  'sigma',
  'pcre',
  'tanium-signal',
  'spl',
  'kql',
  'eql',
]);

/**
 * Matches a single STIX `=` comparison: <object>:<property> = '<value>'
 *
 * Strategy: scan the raw pattern string for `=`-comparison forms without
 * parsing brackets or logical operators. We only care about comparisons whose
 * LHS maps to a supported IocType — AND/OR/FOLLOWEDBY and grouping are
 * irrelevant. A new instance is created per call so lastIndex never leaks.
 *
 * Does NOT match `!=` (requires object:property before `=`; `!` breaks the
 * property-path capture). LIKE / MATCHES / IN use different syntax and contain
 * no `= '<value>'` form, so they are skipped automatically.
 *
 * Not supported: nested precedence, network-traffic SCO references, IN lists.
 */
const makeComparisonRe = () => /([\w-]+):([\w.'"-]+)\s*=\s*'((?:[^'\\]|\\[\s\S])*)'/g;

/**
 * Maps a STIX object-type + property-path pair to an IocType.
 * Returns null for anything not in the closed mapping set.
 *
 * Quoting and casing in the property path are normalised before comparison
 * (e.g. `hashes.'SHA-256'` → `hashes.sha-256`, `hashes.SHA256` → `hashes.sha256`).
 */
const resolveIocType = (objectType: string, propertyPath: string): IocType | null => {
  const obj = objectType.toLowerCase();
  // Strip all quote chars and lowercase for uniform comparison
  const prop = propertyPath.replace(/['"]/g, '').toLowerCase();

  if ((obj === 'ipv4-addr' || obj === 'ipv6-addr') && prop === 'value') return 'ip';
  if (obj === 'domain-name' && prop === 'value') return 'domain';
  if (obj === 'url' && prop === 'value') return 'url';
  if (obj === 'email-addr' && prop === 'value') return 'email';
  if (obj === 'file') {
    if (prop === 'hashes.sha-256' || prop === 'hashes.sha256') return 'hash';
    if (prop === 'hashes.sha-1' || prop === 'hashes.sha1') return 'hash';
    if (prop === 'hashes.md5') return 'hash';
  }
  return null;
};

/**
 * Hash length the declared property implies, so a value can be checked against the
 * algorithm the feed actually named rather than against "any hash".
 */
const resolveExpectedHashLength = (propertyPath: string): number | null => {
  const prop = propertyPath.replace(/['"]/g, '').toLowerCase();
  if (prop === 'hashes.md5') return 32;
  if (prop === 'hashes.sha-1' || prop === 'hashes.sha1') return 40;
  if (prop === 'hashes.sha-256' || prop === 'hashes.sha256') return 64;
  return null;
};

const DOMAIN_SYNTAX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;
const EMAIL_SYNTAX = /^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

/**
 * Checks a value against the type its object path claims.
 *
 * The object path is the *only* thing establishing the type here, so a feed can
 * put anything on the right-hand side and it was taken at face value. Two
 * consequences: `file:hashes.MD5 = 'AABB1122'` was accepted as a discriminating
 * hash and then filed under `sha256` by the promote task's length fallback, and an
 * `ipv4-addr` value that is not an address reached `threat.indicator.ip`, which is
 * an ES `ip` field, so it was a permanent item-level rejection rather than merely a
 * bad row.
 */
const isValidForType = (
  type: IocType,
  value: string,
  expectedHashLength: number | null
): boolean => {
  if (value.length === 0) return false;
  if (type === 'ip') return net.isIP(value) !== 0;
  if (type === 'hash') {
    if (!/^[a-f0-9]+$/i.test(value)) return false;
    return expectedHashLength === null
      ? [32, 40, 64, 128].includes(value.length)
      : value.length === expectedHashLength;
  }
  if (type === 'domain') return DOMAIN_SYNTAX.test(value);
  if (type === 'email') return EMAIL_SYNTAX.test(value);
  if (type === 'url') {
    try {
      const { protocol } = new URL(value);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }
  return true;
};

/**
 * True for an address in private, loopback, link-local, or otherwise reserved
 * space. Those are not indicators: promoting `10.0.0.1` or `::1` puts a row in the
 * live Indicator Match index that matches essentially all internal traffic.
 * `extract_iocs` already tiers them `reference`; this is the structured path
 * catching up.
 */
const isNonRoutableAddress = (value: string): boolean => {
  const family = net.isIP(value);
  if (family === 4) return isNonRoutableIPv4(value);
  if (family === 6) return isNonRoutableIPv6(value);
  return false;
};

/** Unescape STIX string escapes: \\ → \ and \' → ' (single pass, left-to-right). */
const unescapeStixString = (s: string): string => s.replace(/\\([\s\S])/g, (_, ch: string) => ch);

/**
 * Canonicalize extracted value.
 *
 * URLs are case-sensitive in their path/query, so preserved as-is.
 * All other types are lowercased to match extract_iocs canonicalization:
 *   IPs → lowercase (IPv6 hex digits), domains → lowercase,
 *   email → lowercase, hash → lowercase hex.
 */
const canonicalize = (type: IocType, value: string): string =>
  type === 'url' ? value : value.toLowerCase();

/**
 * Parse a STIX 2.x indicator pattern string into structured ExtractedIoc records.
 *
 * @param pattern     - The raw STIX pattern string, e.g. `[ipv4-addr:value = '1.2.3.4']`
 * @param patternType - The pattern dialect (default: 'stix'). Non-stix dialects return [].
 * @returns           - One record per unique (type, value) pair found in the pattern.
 *
 * Never throws — returns [] for empty, malformed, or non-stix input.
 * Does not emit `defanged` or `port` fields (STIX values are fanged/live;
 * socket-form addresses are rare in indicator patterns).
 * tier_basis is 'stix_pattern' for structured lineage, or 'private_ip' for an
 * address in reserved space. Hashes are 'discriminating', private and reserved
 * addresses are 'reference', everything else is 'contextual'.
 *
 * Values are validated against the type their object path claims, and anything
 * that does not match is skipped rather than emitted. Domain tiering (CDN base vs
 * purpose-registered) is still left to a later pass.
 */
export const parseStixPattern = (pattern: string, patternType?: string): ExtractedIoc[] => {
  if (!pattern) return [];
  if (patternType !== undefined && NON_STIX_DIALECTS.has(patternType.toLowerCase())) return [];

  const results: ExtractedIoc[] = [];
  const seen = new Set<string>();

  // `forEach` rather than `for..of` so each comparison can bail with `return`
  // instead of `continue` (see `no-continue`).
  [...pattern.matchAll(makeComparisonRe())].forEach((match) => {
    const [, objectType, propertyPath, rawValue] = match;
    // A null type means a comparison against an object path we do not map.
    const iocType = resolveIocType(objectType, propertyPath);
    if (iocType === null) {
      return;
    }

    const value = canonicalize(iocType, unescapeStixString(rawValue));
    if (!isValidForType(iocType, value, resolveExpectedHashLength(propertyPath))) {
      return;
    }

    const dedupKey = `${iocType}:${value}`;
    if (seen.has(dedupKey)) {
      return;
    }
    seen.add(dedupKey);

    // Private and reserved addresses are `reference`, which the promote task
    // refuses, so they never become live Indicator Match rows.
    const nonRoutable = iocType === 'ip' && isNonRoutableAddress(value);
    const tier: IocTier = nonRoutable
      ? 'reference'
      : iocType === 'hash'
      ? 'discriminating'
      : 'contextual';

    results.push({
      type: iocType,
      value,
      tier,
      tier_heuristic: tier,
      tier_basis: nonRoutable ? 'private_ip' : 'stix_pattern',
    });
  });

  return results;
};
