/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { IOC_TYPES, type IocType } from '../../../common/threat_intelligence/hub';
import { IANA_TLDS } from '../data/iana_tlds';
import { IOC_NOISE_DOMAINS } from '../data/ioc_noise_domains';

/**
 * Domain capability module for the `extract_iocs` action.
 *
 * Pure (no I/O) — same regex set used by Workflow 2 during automated
 * ingestion as well as by the agent-builder tool wrapper and the internal
 * HTTP route. Designed to favor precision over recall; the LLM-driven
 * `hunt_behavior` flow does the deeper pass.
 *
 * Domain filter pipeline (applied in order after regex match):
 *  1. File-extension check — drop if the rightmost label is a known file or
 *     executable extension (.exe, .dll, .ps1, …). Done BEFORE IANA validation
 *     to handle .zip/.mov gTLD collisions. Binary names paired with a real TLD
 *     (powershell.ru, svchost.io) are NOT dropped here — those are valid domains
 *     and potential C2; only the extension suffix form (powershell.exe) is rejected.
 *  2. IANA TLD validation — drop if the rightmost label is not a real IANA TLD.
 *     Eliminates code symbols (.Sleep, .MaxValue), truncated tokens (.hopto),
 *     and any extensions not caught by step 1.
 *  3. Noise domain denylist — drop if the full domain is in the curated list of
 *     security-tooling / vendor / reference domains (elastic.co, urlscan.io, …).
 *  4. Longest-match dedup — if both `a.b.tld` and `b.tld` survive, keep only
 *     `a.b.tld` (PSL-suffix dedup, handles hopto.org vs wndlogon.hopto.org).
 */

export interface ExtractIocsParams {
  text: string;
  defang?: boolean;
}

export interface ExtractedIoc {
  type: IocType;
  value: string;
  defanged?: string;
}

export interface ExtractIocsResult {
  count: number;
  iocs: ExtractedIoc[];
  ioc_set_hash: string | null;
}

const PATTERNS: Record<IocType, RegExp> = {
  hash: /\b([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/gi,
  // IPv4 dotted quad with octet bounds; IPv6 left out (false-positive prone).
  ip: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g,
  // Domain: 2+ labels, last label 2+ alpha chars.
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi,
  url: /\bhttps?:\/\/[^\s<>"']{4,}/gi,
};

const PRIVATE_IP_PREFIXES = ['10.', '127.', '169.254.', '192.168.'];

/**
 * File / executable / script extensions (alpha-only) that look like TLD tokens in
 * dotted notation. Checked BEFORE IANA validation to handle the .zip/.mov gTLD
 * collision: those strings are valid IANA TLDs but `update.zip` / `video.mov`
 * in a CTI report are filenames, not C2 domains.
 *
 * Rule: binary names paired with a real TLD (powershell.ru, svchost.io,
 * powershell.com) are NOT in this set and are NOT dropped — they are valid
 * domains and potential C2 infrastructure. Only the extension form
 * (powershell.exe, svchost.dll) is rejected via this set.
 *
 * NOT included: .com (overwhelmingly a real TLD; command.com false drops not worth it),
 * .py/.pl/.sh (ccTLDs with real registrars — malware C2 on .py/.pl/.sh does exist).
 */
const FILE_EXTENSION_TLDS = new Set([
  // Executable / system
  'exe',
  'dll',
  'sys',
  'drv',
  'ocx',
  'cpl',
  'scr',
  'pif',
  // Scripts and interpreted executables
  'bat',
  'cmd',
  'vbs',
  'vbe',
  'js',
  'jse',
  'wsf',
  'wsh',
  'hta',
  'ps1',
  // Installers / packages
  'msi',
  'msp',
  'msu',
  'cab',
  'inf',
  // Code (not ccTLDs)
  'ts',
  'rb',
  'lua',
  'cs',
  'kt',
  'asm',
  'php',
  'asp',
  'jsp',
  // Data / documents
  'txt',
  'log',
  'ini',
  'cfg',
  'dat',
  'tmp',
  'bak',
  'lnk',
  'dmp',
  'xml',
  'json',
  'yaml',
  'yml',
  'toml',
  'md',
  'rst',
  'csv',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'rtf',
  'odt',
  // Archives — includes .zip and .mov which are IANA gTLDs since 2023
  'zip',
  'rar',
  'tar',
  'iso',
  'dmg',
  'pkg',
  'deb',
  'rpm',
  'jar',
  'war',
  // Media — includes .mov (IANA gTLD)
  'mov',
  'avi',
  'mkv',
  'wmv',
  'flv',
  'ogg',
  'png',
  'jpg',
  'gif',
  'svg',
  'ico',
  'bmp',
  // Crypto / certs
  'pem',
  'cer',
  'crt',
  'key',
  'pfx',
  'csr',
  'sig',
  'asc',
  // Binaries / other
  'bin',
  'dex',
  'apk',
  'ipa',
]);

const isPrivateIp = (ip: string) => PRIVATE_IP_PREFIXES.some((p) => ip.startsWith(p));

/**
 * Returns the rightmost label (the TLD portion) of a dotted domain string.
 * E.g. 'wndlogon.hopto.org' → 'org'
 */
const extractTld = (domain: string): string => {
  const lastDot = domain.lastIndexOf('.');
  return lastDot === -1 ? domain : domain.slice(lastDot + 1);
};

/**
 * Domain filter pipeline: returns true if the domain should be KEPT.
 * Applied in order: file-ext → IANA → noise denylist.
 */
const isDomainKept = (domain: string): boolean => {
  const lower = domain.toLowerCase();
  const tld = extractTld(lower);

  // Step 1 — file extension (before IANA to handle .zip/.mov gTLD collisions)
  if (FILE_EXTENSION_TLDS.has(tld)) return false;

  // Step 2 — IANA TLD validation
  if (!IANA_TLDS.has(tld)) return false;

  // Step 3 — noise domain denylist (full hostname)
  if (IOC_NOISE_DOMAINS.has(lower)) return false;

  return true;
};

/**
 * Longest-match PSL-style deduplication for domains.
 *
 * If domain A is a proper suffix of domain B (B ends with `.A`), A is subsumed
 * by B and should be dropped. Example:
 *   'hopto.org' + 'wndlogon.hopto.org' → keep 'wndlogon.hopto.org' only.
 *
 * This prevents emitting both a truncated fragment and the full C2 domain when
 * the regex matches both, and avoids emitting bare public-suffix tokens as IOCs.
 */
const longestMatchDomainDedup = (domains: string[]): string[] => {
  // Build a Set for O(1) suffix lookup.
  const domainSet = new Set(domains);
  return domains.filter((d) => {
    // Keep d only if no longer domain in the set has d as a suffix.
    // 'wndlogon.hopto.org'.endsWith('.hopto.org') is true → 'hopto.org' is dropped.
    return !Array.from(domainSet).some((other) => other !== d && other.endsWith(`.${d}`));
  });
};

const defangValue = (type: IocType, value: string, shouldDefang: boolean): string => {
  if (!shouldDefang) return value;
  if (type === 'ip' || type === 'domain') return value.replace(/\./g, '[.]');
  if (type === 'url') return value.replace(/^https?:\/\//, (m) => m.replace(/:\/\//, '[:]//'));
  return value;
};

/**
 * Refangs defanged IOC strings back to their canonical form before regex matching.
 *
 * Applied to the full source text once before any pattern matching so that
 * defanged IOCs — the way vendors actually publish live C2 infrastructure —
 * are recovered and matched by the standard patterns.
 *
 * Transformations (applied in order; case-insensitive where noted):
 *   [.] / (.) / {.}              → .    bracket/paren/brace-wrapped dot
 *   [dot] / (dot)                 → .    spelled-out dot (bracketed/parenthesized only;
 *                                        bare " dot " is omitted — too FP-prone in prose)
 *   [://] / [:]//                → ://  bracket-wrapped scheme separator
 *   [:]                          → :    bracket-wrapped colon
 *   hxxp:// / hxxps:// (any case)→ http:// / https://   obfuscated scheme prefix
 *
 * Intentionally conservative: only unambiguous defang markers are transformed.
 * The email `[@]`/`(at)` forms are omitted — email support is not yet implemented
 * and the `at` substring is too common in natural language to transform safely.
 */
const refang = (text: string): string =>
  text
    // Bracket/paren/brace-wrapped dot
    .replace(/\[\.\]|\(\.\)|\{\.\}/g, '.')
    // Spelled-out dot in brackets or parens only — bare " dot " is NOT refanged
    // (too FP-prone: "asp dot net", "polka dot pattern" would corrupt natural language)
    .replace(/\[dot\]|\(dot\)/gi, '.')
    // Bracket-wrapped scheme separator: [://] or [:]// → ://
    .replace(/\[:\/\/\]|\[:\]\/\//g, '://')
    // Bracket-wrapped colon (after scheme separator already handled)
    .replace(/\[:\]/g, ':')
    // Obfuscated scheme prefix: hxxps?:// (any casing of the XX) → http(s)://
    .replace(/hxxps?:\/\//gi, (m) =>
      m.toLowerCase().startsWith('hxxps') ? 'https://' : 'http://'
    );

export const extractIocs = ({ text, defang = true }: ExtractIocsParams): ExtractIocsResult => {
  // Pre-pass: recover defanged IOCs before regex matching.
  const refangedText = refang(text);
  const seen = new Set<string>();
  const rawDomains: string[] = [];
  const iocs: ExtractedIoc[] = [];

  // Pass 1 — collect non-domain IOCs and candidate domain strings.
  for (const type of IOC_TYPES) {
    const matches = refangedText.match(PATTERNS[type]) ?? [];
    for (const raw of matches) {
      if (type === 'domain') {
        // Domains go through the full filter pipeline + longest-match dedup below.
        rawDomains.push(raw);
      } else {
        // Normalize: lowercase hashes (hex) and urls (scheme+host are case-insensitive).
        // IPs are digits-only; no case change needed.
        const value = type === 'hash' || type === 'url' ? raw.toLowerCase() : raw;
        const dedupKey = `${type}:${value.toLowerCase()}`;
        const isPrivateIpHit = type === 'ip' && isPrivateIp(value);
        if (!seen.has(dedupKey) && !isPrivateIpHit) {
          seen.add(dedupKey);
          iocs.push({ type, value, defanged: defangValue(type, value, defang) });
        }
      }
    }
  }

  // Pass 2 — domain filter pipeline: step 1-4 per domain, then longest-match dedup.
  // Lowercase before filtering so isDomainKept and longestMatchDomainDedup work
  // on normalized strings; stored `value` is the lowercase canonical form.
  const lowercasedDomains = rawDomains.map((d) => d.toLowerCase());
  const filteredDomains = longestMatchDomainDedup(lowercasedDomains.filter(isDomainKept));
  for (const domain of filteredDomains) {
    const dedupKey = `domain:${domain}`;
    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      iocs.push({ type: 'domain', value: domain, defanged: defangValue('domain', domain, defang) });
    }
  }

  // Sorted-set fingerprint of the unique IOC values in this report. Workflow 2
  // persists this to `extracted.ioc_set_hash` and uses it to find other reports
  // with overlapping infrastructure. `value` is already normalized (lowercase for
  // domain/url/hash); the .toLowerCase() call is a safety net for ip and future types.
  const iocSetHash =
    iocs.length === 0
      ? null
      : createHash('sha256')
          .update(
            iocs
              .map((ioc) => `${ioc.type}:${ioc.value.toLowerCase()}`)
              .sort()
              .join('\n')
          )
          .digest('hex');

  return {
    count: iocs.length,
    iocs,
    ioc_set_hash: iocSetHash,
  };
};
