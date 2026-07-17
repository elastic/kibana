/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IocType } from '../../../../common/threat_intelligence/hub';
import type { ExtractedIoc, IocTier } from '../../services/extract_iocs';

/**
 * Pattern dialects that are not observable patterns — skip them entirely.
 * STIX (or unspecified → assumed stix) is the only parseable dialect here.
 */
const NON_STIX_DIALECTS = new Set(['yara', 'snort', 'sigma', 'pcre', 'tanium-signal', 'spl', 'kql', 'eql']);

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
 * Not handled (deliberately out of scope for this slice):
 *   - Deeply nested parentheses altering operator precedence
 *   - network-traffic:* references (SCO, not an atomic indicator)
 *   - IN lists  (multiple values per comparison — no `= '<literal>'` form)
 */
const makeComparisonRe = () =>
  /([\w-]+):([\w.'"-]+)\s*=\s*'((?:[^'\\]|\\[\s\S])*)'/g;

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

/** Unescape STIX string escapes: \\ → \ and \' → ' (single pass, left-to-right). */
const unescapeStixString = (s: string): string =>
  s.replace(/\\([\s\S])/g, (_, ch: string) => ch);

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
 * tier_basis is 'stix_pattern' for all records, marking structured lineage.
 * Hashes are 'discriminating'; all other types are 'contextual'.
 * A future tiering pass could refine IPs (private/loopback → reference)
 * and domains (CDN base vs purpose-registered) — kept simple here.
 */
export const parseStixPattern = (pattern: string, patternType?: string): ExtractedIoc[] => {
  if (!pattern) return [];
  if (patternType !== undefined && NON_STIX_DIALECTS.has(patternType.toLowerCase())) return [];

  const results: ExtractedIoc[] = [];
  const seen = new Set<string>();

  for (const match of pattern.matchAll(makeComparisonRe())) {
    const [, objectType, propertyPath, rawValue] = match;
    const iocType = resolveIocType(objectType, propertyPath);
    if (iocType === null) continue;

    const value = canonicalize(iocType, unescapeStixString(rawValue));
    const dedupKey = `${iocType}:${value}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const tier_heuristic: IocTier = iocType === 'hash' ? 'discriminating' : 'contextual';

    results.push({
      type: iocType,
      value,
      tier: tier_heuristic,
      tier_heuristic,
      tier_basis: 'stix_pattern',
    });
  }

  return results;
};
