/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { type IocType } from '../../../common/threat_intel';
import { IANA_TLDS } from '../data/iana_tlds';
import { IOC_NOISE_DOMAINS } from '../data/ioc_noise_domains';
import {
  normalizeHeader,
  IOC_HEADER_TERMS,
  TERMINATOR_HEADER_TERMS,
  TERMINATOR_PREFIXES,
} from '../adapters/section_headers';
import { isNonRoutableIPv4 } from '../lib/ip_ranges';

/** IOC tier for correlation anchoring. */
export type IocTier = 'discriminating' | 'contextual' | 'reference' | 'denied' | 'uncertain';

export interface ExtractIocsParams {
  text: string;
  defang?: boolean;
}

export interface ExtractedIoc {
  type: IocType;
  value: string;
  defanged?: string;
  tier: IocTier;
  tier_heuristic: IocTier;
  tier_basis: string;
  port?: number;
}

type WorkingIoc = ExtractedIoc & { _offset?: number };

export interface ExtractIocsResult {
  count: number;
  iocs: ExtractedIoc[];
  ioc_set_hash: string | null;
}

// ── Atomic patterns ────────────────────────────────────────────────────────────
const HASH_PATTERN = /\b([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/gi;
// IPv4 dotted quad with octet bounds; IPv6 left out (false-positive prone).
const IP_PATTERN = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g;
// Domain: 2+ labels, last label 2+ alpha chars.
const DOMAIN_PATTERN = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']{4,}/gi;

// ── Compound patterns ──────────────────────────────────────────────────────────
// email: local-part @ host (with optional defanged [.] in host)
// local-part: printable non-whitespace non-@ chars
const EMAIL_PATTERN = /\b[a-z0-9._%+\-]+@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z]{2,24}\b/gi;

// CIDR: IPv4/mask (defang already applied before this runs)
const CIDR_PATTERN =
  /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\/(?:3[0-2]|[12]?\d)\b/g;

// Crypto wallets — MUST run before hash.
// BTC legacy: starts with 1 or 3, base58, 26-34 chars.
const BTC_LEGACY_PATTERN = /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g;
// BTC bech32: bc1 prefix, lowercase alphanumeric, 20+ chars after prefix.
const BTC_BECH32_PATTERN = /\bbc1[a-z0-9]{20,}\b/g;
// ETH: 0x + exactly 40 hex chars.
const ETH_PATTERN = /\b0x[a-fA-F0-9]{40}\b/g;

// Socket: ip:port or domain:port.
// Captures host and port separately. Host can be IPv4 or domain.
const IPV4_OCTET = '(?:25[0-5]|2[0-4]\\d|[01]?\\d?\\d)';
const IPV4 = `(?:${IPV4_OCTET}\\.){3}${IPV4_OCTET}`;
const DOMAIN_LABEL = '[a-z0-9](?:[a-z0-9\\-]*[a-z0-9])?';
const DOMAIN_HOST = `(?:${DOMAIN_LABEL}\\.)+[a-z]{2,24}`;
const SOCKET_PATTERN = new RegExp(`\\b(${IPV4}|${DOMAIN_HOST}):(\\d{1,5})\\b`, 'gi');

// ── Keep existing filter infrastructure ─────────────────────────────────────

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

/** Code-like TLD tokens; keep only when defanged or URL-host corroborated. */
const AMBIGUOUS_TLDS = new Set(['py', 'sh', 'run', 'shell', 'name', 'pl', 'rb', 'lua', 'ps']);

/** Bare public suffix tokens (e.g. co.uk) are not registrable domains. */
const PUBLIC_SUFFIX_DROPLIST = new Set([
  // UK second-level registry suffixes
  'co.uk',
  'org.uk',
  'me.uk',
  'net.uk',
  'ltd.uk',
  'plc.uk',
  // Australia
  'com.au',
  'net.au',
  'org.au',
  'id.au',
  // Brazil
  'com.br',
  'net.br',
  'org.br',
  // New Zealand
  'co.nz',
  'net.nz',
  'org.nz',
  // Israel
  'co.il',
  'org.il',
  'net.il',
  // South Korea
  'co.kr',
  'or.kr',
  'ne.kr',
  // Saudi Arabia
  'com.sa',
  'net.sa',
  'org.sa',
  // Indonesia (c.id and co.id are both registry suffixes)
  'co.id',
  'c.id',
  'net.id',
  'or.id',
  // Argentina
  'com.ar',
  'net.ar',
  'org.ar',
  // Japan
  'co.jp',
  'ne.jp',
  'or.jp',
  // China
  'com.cn',
  'net.cn',
  'org.cn',
  // India
  'co.in',
  'net.in',
  'org.in',
  // South Africa
  'co.za',
  'net.za',
  'org.za',
]);

/**
 * Non-routable addresses are observability entries, not C2 anchors, so they are
 * tiered `reference`. Shares its range set with the SSRF guard in
 * `adapters/http_client` so the two definitions cannot drift.
 */
const isPrivateIp = (ip: string) => isNonRoutableIPv4(ip);

/**
 * Pure security-vendor and research domains — exact-match OR suffix-match
 * (so research.kaspersky.com, blog.eset.com are caught without explicit enumeration).
 *
 * Match rule: domain === base  OR  domain.endsWith('.' + base)
 * The dotted `.${base}` form prevents collisions (reset.com must NOT match eset.com).
 *
 * Only pure security vendors / research orgs belong here. Content-hosting platforms
 * (github.com, npmjs.com) belong in the uncertain bucket — their path is the signal.
 * microsoft.com stays here: it appears only as a product/download reference in CTI.
 */
const VENDOR_RESEARCH_DOMAINS = new Set([
  'kaspersky.com',
  'securelist.com',
  'eset.com',
  'welivesecurity.com',
  'paloaltonetworks.com',
  'mandiant.com',
  'sentinelone.com',
  'sophos.com',
  'fortinet.com',
  'dragos.com',
  'recordedfuture.com',
  'ahnlab.com',
  'nviso.eu',
  'harfanglab.io',
  'microsoft.com',
]);

/**
 * Well-known CDN / cloud / hosting base domains that appear regularly as IOC
 * infrastructure but are too common to be discriminating anchors. Subdomains of
 * these that appear in threat reports are real (contextual), but they cannot
 * uniquely fingerprint a campaign the way a purpose-registered C2 domain can.
 *
 * Intentionally small — extend conservatively. A missed entry means an IOC gets
 * `uncertain` (safe contextual fallback) rather than `contextual`; that is
 * acceptable. An over-aggressive entry means a genuine C2 is downgraded, which
 * costs detection signal.
 *
 * NOT listed: github.com, virustotal.com, elastic.co — those are in
 * IOC_NOISE_DOMAINS (reference tier) or VENDOR_RESEARCH_DOMAINS, not here.
 */
const LOW_DISCRIMINATION_DOMAINS = new Set([
  'amazonaws.com',
  's3.amazonaws.com',
  'cloudfront.net',
  'azurewebsites.net',
  'blob.core.windows.net',
  'azureedge.net',
  'onmicrosoft.com',
  'googleapis.com',
  'storage.googleapis.com',
  'aliyuncs.com',
  'oss-cn-hangzhou.aliyuncs.com',
  'fcapp.run',
  'workers.dev',
  'pages.dev',
  'netlify.app',
  'vercel.app',
  'ngrok.io',
  'ngrok.app',
  'serveo.net',
  'dyndns.org',
  'no-ip.com',
  'ddns.net',
  'hopto.org',
  'zapto.org',
  'myftp.biz',
  'myftp.org',
  'sytes.net',
  'redirectme.net',
  'onthewifi.com',
  // Content-hosting platforms: path is the signal, bare host is not discriminating.
  'github.com',
  'raw.githubusercontent.com',
]);

/**
 * Classifies an already-kept domain into an IOC tier.
 * Called AFTER the domain has passed all filter gates (it is a real IOC).
 * Returns { tier, basis } where tier is the heuristic assignment and
 * basis is the rule name for observability.
 */
const classifyDomainTier = (
  domain: string,
  defangedDomains: ReadonlySet<string>
): { tier: IocTier; basis: string } => {
  // Defanged-in-source is the strongest discriminating signal — vendor deliberately
  // marked this domain as live C2.
  if (defangedDomains.has(domain)) {
    return { tier: 'discriminating', basis: 'defanged_source' };
  }

  // Well-known CDN / cloud / DynDNS base domains — real but not specific.
  if (LOW_DISCRIMINATION_DOMAINS.has(domain)) {
    return { tier: 'contextual', basis: 'known_cdn' };
  }

  // Check if domain ends with a LOW_DISCRIMINATION_DOMAINS suffix (e.g. *.amazonaws.com)
  for (const cdnBase of LOW_DISCRIMINATION_DOMAINS) {
    if (domain.endsWith(`.${cdnBase}`)) {
      return { tier: 'contextual', basis: 'known_cdn' };
    }
  }

  return { tier: 'uncertain', basis: 'uncertain_default' };
};

/**
 * Returns the rightmost label (the TLD portion) of a dotted domain string.
 * E.g. 'wndlogon.hopto.org' → 'org'
 */
const extractTld = (domain: string): string => {
  const lastDot = domain.lastIndexOf('.');
  return lastDot === -1 ? domain : domain.slice(lastDot + 1);
};

type DomainFilterResult = { emit: false } | { emit: true; tier: IocTier; basis: string };

/**
 * Domain filter pipeline.
 *
 * Hard drops (emit: false) — these tokens are not IOCs at all:
 *   b.  File extension TLDs (.exe, .dll, .zip, .mov …)
 *   b2. Bare public-suffix tokens (co.uk, com.br …)
 *   c.  Non-IANA TLDs (code symbols, truncated fragments)
 *   a.  (Checked upstream) Redaction-adjacency masked tokens
 *
 * Soft emit (emit: true with tier) — real tokens that are tracked but
 * excluded from the discrimination / anchor match space:
 *   d.  Noise-domain denylist  → reference / tier_basis: denylist
 *   e.  Ambiguous-TLD code-shape gate (failed corroboration) → denied / tier_basis: code_shaped
 *
 * Kept IOCs (emit: true) — real threat indicators:
 *   Passed all hard-drop tests → classified by classifyDomainTier.
 *
 * Redaction-adjacency (step a) is checked upstream because it requires match
 * position from matchAll; this function receives already-position-filtered tokens.
 */
const classifyDomain = (
  domain: string,
  defangedDomains: ReadonlySet<string>,
  urlHosts: ReadonlySet<string>
): DomainFilterResult => {
  const lower = domain.toLowerCase();
  const tld = extractTld(lower);

  // Step b — file extension (before IANA to handle .zip/.mov gTLD collisions)
  if (FILE_EXTENSION_TLDS.has(tld)) return { emit: false };

  // Step b2 — bare public-suffix guard
  if (PUBLIC_SUFFIX_DROPLIST.has(lower)) return { emit: false };

  // Step c — IANA TLD validation
  if (!IANA_TLDS.has(tld)) return { emit: false };

  // Step d — noise domain denylist: KEEP but tag reference so it's visible + measurable.
  if (IOC_NOISE_DOMAINS.has(lower)) {
    return { emit: true, tier: 'reference', basis: 'denylist' };
  }

  // Step d2 — vendor/research domain suffix match: KEEP but tag reference.
  // Exact match OR subdomain of a known vendor base (dotted prefix prevents collisions).
  for (const base of VENDOR_RESEARCH_DOMAINS) {
    if (lower === base || lower.endsWith(`.${base}`)) {
      return { emit: true, tier: 'reference', basis: 'vendor_research' };
    }
  }

  // Step e — corroboration gate for ambiguous/code-shaped TLDs: KEEP but tag denied.
  // denied = high-confidence noise, excluded from anchor match space. Only assigned
  // here because we are CERTAIN (code-shaped token without any corroboration signal).
  if (AMBIGUOUS_TLDS.has(tld)) {
    if (!defangedDomains.has(lower) && !urlHosts.has(lower)) {
      return { emit: true, tier: 'denied', basis: 'code_shaped' };
    }
  }

  // Passed all filters — classify by discriminating signal.
  const { tier, basis } = classifyDomainTier(lower, defangedDomains);
  return { emit: true, tier, basis };
};

interface DomainCandidate {
  domain: string;
  tier: IocTier;
  basis: string;
  offset: number;
}

/**
 * Longest-match PSL-style deduplication for domains.
 *
 * If domain A is a proper suffix of domain B (B ends with `.A`), A is subsumed
 * by B and should be dropped. Example:
 *   'hopto.org' + 'wndlogon.hopto.org' → keep 'wndlogon.hopto.org' only.
 *
 * Only applies within the set of kept (non-hard-dropped) candidates that have
 * the same or compatible tiers; reference/denied items are always kept as-is
 * (their presence is informational, not inferential).
 */
const longestMatchDomainDedup = (candidates: DomainCandidate[]): DomainCandidate[] => {
  // Materialised once: the set is static across the scan, so converting it per
  // candidate would make this quadratic on the allocation path as well.
  const domains = Array.from(new Set(candidates.map((c) => c.domain)));
  return candidates.filter((c) => {
    // Always keep reference/denied — they are observability entries, not anchors.
    if (c.tier === 'reference' || c.tier === 'denied') return true;
    return !domains.some((other) => other !== c.domain && other.endsWith(`.${c.domain}`));
  });
};

const defangValue = (type: IocType, value: string, shouldDefang: boolean): string => {
  if (!shouldDefang) return value;
  if (type === 'ip' || type === 'domain' || type === 'cidr') return value.replace(/\./g, '[.]');
  if (type === 'email') return value.replace(/@/, '[@]');
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
 *   [@] / (at)                   → @    email defang markers
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
    .replace(/hxxps?:\/\//gi, (m) => (m.toLowerCase().startsWith('hxxps') ? 'https://' : 'http://'))
    // Email defang: [@] or (at) → @
    .replace(/\[@\]|\(at\)/gi, '@');

/** Masking glyphs used in victim-domain redaction tables (e.g. aad****ie.com). */
const REDACTION_GLYPHS = new Set(['*', '＊', '█', '●']);

/**
 * Span-consumption tracker. After each compound match we record the [start, end)
 * character range so later passes only look at unconsumed text.
 */
type Span = readonly [number, number];

const isConsumed = (index: number, len: number, consumed: readonly Span[]): boolean => {
  const end = index + len;
  return consumed.some(([s, e]) => index >= s && end <= e);
};

/** A match whose offset the regex engine actually resolved. */
type OffsetMatch = RegExpMatchArray & { index: number };

/**
 * Every extraction pass needs the match offset, and `matchAll` types it as
 * optional. Filtering here lets each pass treat `index` as a number.
 */
function* matchesWithOffset(text: string, pattern: RegExp): Generator<OffsetMatch> {
  for (const match of text.matchAll(pattern)) {
    if (match.index !== undefined) {
      yield match as OffsetMatch;
    }
  }
}

/**
 * Matches an earlier pass has not already claimed. Passes run in precedence
 * order (email, URL, CIDR, wallet, socket, hash, IP, domain) and each records
 * the span it consumed, so a later pattern must not re-extract a substring of
 * something already emitted as a more specific type.
 */
function* unconsumedMatches(
  text: string,
  pattern: RegExp,
  consumed: readonly Span[]
): Generator<OffsetMatch> {
  for (const match of matchesWithOffset(text, pattern)) {
    if (!isConsumed(match.index, match[0].length, consumed)) {
      yield match;
    }
  }
}

/**
 * True when the token at `index` is the tail of a redacted label rather than a
 * domain of its own: a run of masking glyphs glued to a preceding alphanumeric
 * label, as in `aad****ie.com`, where `ie.com` is not the indicator.
 */
const isRedactionFragment = (text: string, index: number): boolean => {
  if (index === 0 || !REDACTION_GLYPHS.has(text[index - 1])) {
    return false;
  }
  let cursor = index - 1;
  while (cursor >= 0 && REDACTION_GLYPHS.has(text[cursor])) {
    cursor--;
  }
  return cursor >= 0 && /[a-z0-9]/i.test(text[cursor]);
};

/** Domain matches that survive the redaction-adjacency check. */
function* domainCandidateMatches(
  text: string,
  pattern: RegExp,
  consumed: readonly Span[]
): Generator<OffsetMatch> {
  for (const match of unconsumedMatches(text, pattern, consumed)) {
    if (!isRedactionFragment(text, match.index)) {
      yield match;
    }
  }
}

/**
 * `host:port` matches whose port is a real one. `SOCKET_PATTERN` allows up to
 * five digits, so it also matches things like `10.0.0.1:99999` and version
 * strings, which are not sockets.
 */
function* socketMatches(
  text: string,
  pattern: RegExp,
  consumed: readonly Span[]
): Generator<{ match: OffsetMatch; host: string; portNum: number }> {
  for (const match of unconsumedMatches(text, pattern, consumed)) {
    const portNum = parseInt(match[2], 10);
    if (portNum >= 1 && portNum <= 65535) {
      yield { match, host: match[1].toLowerCase(), portNum };
    }
  }
}

/**
 * Mask consumed spans in text so later regexes don't match inside them.
 * Replaces each consumed character with a null byte (not a word character,
 * not alphanumeric, won't create new regex matches).
 */
const maskConsumedSpans = (text: string, consumed: readonly Span[]): string => {
  if (consumed.length === 0) return text;
  const chars = text.split('');
  for (const [s, e] of consumed) {
    for (let i = s; i < e; i++) {
      chars[i] = '\x00';
    }
  }
  return chars.join('');
};

export type SectionKind = 'ioc' | 'references';

export interface SectionSpan {
  start: number;
  end: number;
  kind: SectionKind;
}

const isIocHeader = (normalized: string): boolean => IOC_HEADER_TERMS.has(normalized);

const isTerminatorHeader = (normalized: string): boolean =>
  TERMINATOR_HEADER_TERMS.has(normalized) ||
  TERMINATOR_PREFIXES.some((p) => normalized.startsWith(p));

/**
 * Segment structured text (output of htmlToStructured) into labelled section spans.
 * Only `## <heading>` lines delimit sections; prose blocks have no span entry.
 *
 * Returns only 'ioc' and 'references' spans — other headings are ignored.
 * Spans cover from the heading line start to the next heading (or end of text).
 * Offsets are character positions in `text` (the same string passed to extractIocs).
 */
export const classifySectionSpans = (text: string): readonly SectionSpan[] => {
  const spans: SectionSpan[] = [];
  const lines = text.split('\n');
  let offset = 0;
  let currentKind: SectionKind | null = null;
  let currentStart = 0;

  for (const line of lines) {
    const headingMatch = /^##\s+(.+)$/.exec(line);
    if (headingMatch) {
      if (currentKind !== null) {
        spans.push({ start: currentStart, end: offset, kind: currentKind });
        currentKind = null;
      }
      const normalized = normalizeHeader(headingMatch[1]);
      if (isIocHeader(normalized)) {
        currentKind = 'ioc';
        currentStart = offset;
      } else if (isTerminatorHeader(normalized)) {
        currentKind = 'references';
        currentStart = offset;
      }
    }
    // Advance past this line and its trailing '\n' (join('\n') separator).
    offset += line.length + 1;
  }

  if (currentKind !== null) {
    spans.push({ start: currentStart, end: text.length, kind: currentKind });
  }

  return spans;
};

/**
 * Determine the highest-priority section kind that contains the IOC value,
 * scanning ALL section spans for a string occurrence of the value.
 *
 * Scans section spans for the IOC value string (not just the first extraction offset).
 * Precedence: 'ioc' > 'references' > null (no span / prose).
 */
const findBestSectionKind = (
  value: string,
  spans: readonly SectionSpan[],
  refangedText: string
): SectionKind | null => {
  const needle = value.toLowerCase();
  let best: SectionKind | null = null;
  for (const span of spans) {
    const spanText = refangedText.slice(span.start, span.end).toLowerCase();
    if (spanText.includes(needle)) {
      if (span.kind === 'ioc') return 'ioc'; // highest priority — short-circuit
      if (best === null) best = span.kind;
    }
  }
  return best;
};

/**
 * Post-pass: override tier/tier_basis for IOCs that appear in a classified
 * section span. tier_heuristic is NEVER modified — it records the per-value
 * heuristic verdict immutably for the observability loop.
 *
 * Uses value-string scanning so values in prose before their IOC-table occurrence
 * are still promoted correctly.
 *
 * Precedence (do NOT violate):
 *   defanged/ioc_section (discriminating) > denylist/vendor_research (reference)
 *     > references_section (reference) > per-value heuristic
 *
 * IOC-section: → discriminating/ioc_section
 *   UNLESS tier_heuristic === 'reference' with basis 'denylist' or 'vendor_research'
 *   (high-confidence reference stays reference even in a sloppy IOC table).
 *
 * References-section: → reference/references_section
 *   UNLESS already discriminating (defanged_source or ioc_section) — defanged value
 *   in a citation is still a real IOC.
 */
/**
 * The tier/basis a containing section imposes, or `null` to keep the per-value
 * heuristic verdict.
 */
const sectionOverrideFor = (
  ioc: WorkingIoc,
  kind: SectionKind
): { tier: IocTier; basis: string } | null => {
  if (kind === 'ioc') {
    // Denylist / vendor_research reference stays — they are high-confidence noise.
    if (
      ioc.tier_heuristic === 'reference' &&
      (ioc.tier_basis === 'denylist' || ioc.tier_basis === 'vendor_research')
    ) {
      return null;
    }
    // Bare content-host / CDN domains: the path-bearing URL is the indicator, not the
    // bare host. A bare github.com in an IOC section is a URL reference, not a C2 anchor.
    // tier_basis 'known_cdn' is set by classifyDomainTier for LOW_DISCRIMINATION_DOMAINS
    // entries (including github.com, raw.githubusercontent.com, amazonaws.com subdomains,
    // etc.). These stay at their heuristic tier (contextual/uncertain), not discriminating.
    if (ioc.type === 'domain' && ioc.tier_basis === 'known_cdn') {
      return null;
    }
    return { tier: 'discriminating', basis: 'ioc_section' };
  }

  // references section: downgrade unless already discriminating
  if (ioc.tier === 'discriminating') {
    return null;
  }
  return { tier: 'reference', basis: 'references_section' };
};

const applySectionOverrides = (
  iocs: readonly WorkingIoc[],
  spans: readonly SectionSpan[],
  refangedText: string
): void => {
  if (spans.length === 0) return;
  for (const ioc of iocs) {
    const kind = findBestSectionKind(ioc.value, spans, refangedText);
    const override = kind === null ? null : sectionOverrideFor(ioc, kind);
    if (override) {
      ioc.tier = override.tier;
      ioc.tier_basis = override.basis;
    }
  }
};

export const extractIocs = ({ text, defang = true }: ExtractIocsParams): ExtractIocsResult => {
  // Pre-pass: recover defanged IOCs before regex matching.
  const refangedText = refang(text);
  const seen = new Set<string>();
  const iocByKey = new Map<string, WorkingIoc>();
  const iocs: WorkingIoc[] = [];
  const consumed: Span[] = [];

  // ── Corroboration signal 1: defanged-in-source domains ───────────────────
  // A domain present in refangedText but absent from the original text was
  // created BY refang, meaning the vendor deliberately defanged it — strongest
  // possible corroboration that it is a live indicator.
  const originalLower = text.toLowerCase();
  const rawDomainsInOriginal = new Set(
    (originalLower.match(DOMAIN_PATTERN) ?? []).map((d) => d.toLowerCase())
  );

  // Mask email spans before scanning for defanged domains so that a provider host
  // that was defanged ONLY inside an email (gmail[.]com in admin@gmail[.]com) is not
  // promoted into defangedDomains. A domain that is ALSO defanged standalone elsewhere
  // (evil[.]com in "admin@evil[.]com and C2 evil[.]com") still surfaces correctly
  // because its standalone occurrence survives the masking.
  const emailSpans: Span[] = [];
  {
    const emailPat = new RegExp(EMAIL_PATTERN.source, EMAIL_PATTERN.flags);
    for (const m of refangedText.matchAll(emailPat)) {
      if (m.index !== undefined) emailSpans.push([m.index, m.index + m[0].length]);
    }
  }
  const refangedTextNoEmails = maskConsumedSpans(refangedText, emailSpans);
  const refangedLowerNoEmails = refangedTextNoEmails.toLowerCase();
  const rawDomainsInRefangedNoEmails = (refangedLowerNoEmails.match(DOMAIN_PATTERN) ?? []).map(
    (d) => d.toLowerCase()
  );

  const defangedDomains: ReadonlySet<string> = new Set(
    rawDomainsInRefangedNoEmails.filter((d) => !rawDomainsInOriginal.has(d))
  );

  // ── Corroboration signal 1b: defanged-in-source IPs ──────────────────────
  // Mirrors defangedDomains: an IP present in refangedTextNoEmails but absent
  // from the original text was created by refang → vendor deliberately defanged
  // it (e.g. 142[.]11[.]206[.]73) → strongest discriminating signal for IPs.
  const rawIpsInOriginal = new Set(
    (originalLower.match(new RegExp(IP_PATTERN.source, IP_PATTERN.flags)) ?? []).map((ip) =>
      ip.toLowerCase()
    )
  );
  const defangedIps: ReadonlySet<string> = new Set(
    (refangedLowerNoEmails.match(new RegExp(IP_PATTERN.source, IP_PATTERN.flags)) ?? []).filter(
      (ip) => !rawIpsInOriginal.has(ip)
    )
  );

  const pushIoc = (ioc: WorkingIoc) => {
    const dedupKey = `${ioc.type}:${ioc.value.toLowerCase()}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);
    iocs.push(ioc);
    iocByKey.set(dedupKey, ioc);
  };

  // ── PASS 1: emails ────────────────────────────────────────────────────────
  // Full address is the indicator; host-domain is suppressed (mail provider noise).
  {
    const pattern = new RegExp(EMAIL_PATTERN.source, EMAIL_PATTERN.flags);
    for (const match of matchesWithOffset(refangedText, pattern)) {
      const raw = match[0].toLowerCase();
      const idx = match.index;
      consumed.push([idx, idx + match[0].length]);

      // Email tier: defanged-in-source → discriminating (like a defanged domain)
      // We check if the @ was in the original text or reconstructed by refang.
      const wasDefanged = !text.toLowerCase().includes(raw);
      const tier: IocTier = wasDefanged ? 'discriminating' : 'uncertain';
      const basis = wasDefanged ? 'defanged_source' : 'uncertain_default';

      pushIoc({
        type: 'email',
        value: raw,
        defanged: defangValue('email', raw, defang),
        tier,
        tier_heuristic: tier,
        tier_basis: basis,
        _offset: idx,
      });
    }
  }

  // ── PASS 2: URLs ──────────────────────────────────────────────────────────
  const rawUrls: string[] = [];
  const rawUrlOffsets: number[] = [];
  {
    const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
    for (const match of matchesWithOffset(refangedText, pattern)) {
      const raw = match[0].toLowerCase();
      const idx = match.index;
      consumed.push([idx, idx + match[0].length]);
      rawUrls.push(raw);
      rawUrlOffsets.push(idx);

      // URL tier: lift-only. A discriminating host lifts the URL to discriminating.
      // Any non-discriminating host (reference, contextual, uncertain) leaves the URL
      // uncertain — the path/query carries the signal and B2 should judge the full URL.
      let tier: IocTier = 'uncertain';
      let basis = 'uncertain_default';
      try {
        const host = new URL(raw).hostname.toLowerCase();
        if (host) {
          const hostResult = classifyDomainTier(host, defangedDomains);
          if (hostResult.tier === 'discriminating') {
            tier = 'discriminating';
            basis = `url_host_inherited:${hostResult.basis}`;
          }
        }
      } catch {
        // malformed URL — keep uncertain
      }

      pushIoc({
        type: 'url',
        value: raw,
        defanged: defangValue('url', raw, defang),
        tier,
        tier_heuristic: tier,
        tier_basis: basis,
        _offset: idx,
      });
    }
  }

  // ── Corroboration signal 2: URL hosts ─────────────────────────────────────
  const urlHostList: string[] = rawUrls.flatMap((url) => {
    try {
      return [new URL(url).hostname.toLowerCase()];
    } catch {
      return [];
    }
  });
  const urlHosts: ReadonlySet<string> = new Set(urlHostList);

  // Derive URL host domains as explicit IOCs (like CIDR → bare IP).
  // The URL consumes its span; the host must be derived explicitly so it
  // isn't lost. Run through domain filter pipeline — urlHosts corroboration
  // means ambiguous TLDs (evil.py) correctly pass the gate here.
  for (let i = 0; i < urlHostList.length; i++) {
    const host = urlHostList[i];
    const result = classifyDomain(host, defangedDomains, urlHosts);
    const dedupKey = `domain:${host}`;
    if (result.emit && !seen.has(dedupKey)) {
      seen.add(dedupKey);
      iocs.push({
        type: 'domain',
        value: host,
        defanged: defangValue('domain', host, defang),
        tier: result.tier,
        tier_heuristic: result.tier,
        tier_basis: result.basis,
        _offset: rawUrlOffsets[i],
      });
    }
  }

  // ── PASS 3: CIDRs ─────────────────────────────────────────────────────────
  // Emit cidr value AND derive bare network IP.
  {
    const pattern = new RegExp(CIDR_PATTERN.source, CIDR_PATTERN.flags);
    for (const match of unconsumedMatches(refangedText, pattern, consumed)) {
      const raw = match[0];
      const idx = match.index;
      consumed.push([idx, idx + raw.length]);

      const slashIdx = raw.indexOf('/');
      const networkIp = raw.slice(0, slashIdx);
      const maskWidth = parseInt(raw.slice(slashIdx + 1), 10);

      // CIDR tier: mask-width driven. ≥/29 → discriminating (narrow/near-host), else contextual.
      const cidrTier: IocTier = maskWidth >= 29 ? 'discriminating' : 'contextual';
      const cidrBasis = maskWidth >= 29 ? 'cidr_narrow' : 'cidr_broad';

      pushIoc({
        type: 'cidr',
        value: raw,
        defanged: defangValue('cidr', raw, defang),
        tier: cidrTier,
        tier_heuristic: cidrTier,
        tier_basis: cidrBasis,
        _offset: idx,
      });

      // Derived bare IP — private wins, then defanged-in-source, else uncertain.
      let ipTier: IocTier;
      let ipBasis: string;
      if (isPrivateIp(networkIp)) {
        ipTier = 'reference';
        ipBasis = 'private_ip';
      } else if (defangedIps.has(networkIp)) {
        ipTier = 'discriminating';
        ipBasis = 'defanged_source';
      } else {
        ipTier = 'uncertain';
        ipBasis = 'uncertain_default';
      }
      pushIoc({
        type: 'ip',
        value: networkIp,
        defanged: defangValue('ip', networkIp, defang),
        tier: ipTier,
        tier_heuristic: ipTier,
        tier_basis: ipBasis,
        _offset: idx,
      });
    }
  }

  // ── PASS 4: Wallets (BEFORE hash) ─────────────────────────────────────────
  {
    const walletPatterns: RegExp[] = [
      new RegExp(BTC_LEGACY_PATTERN.source, BTC_LEGACY_PATTERN.flags),
      new RegExp(BTC_BECH32_PATTERN.source, BTC_BECH32_PATTERN.flags),
      new RegExp(ETH_PATTERN.source, ETH_PATTERN.flags),
    ];
    for (const pattern of walletPatterns) {
      for (const match of unconsumedMatches(refangedText, pattern, consumed)) {
        const raw = match[0];
        const idx = match.index;
        consumed.push([idx, idx + raw.length]);

        pushIoc({
          type: 'wallet',
          value: raw,
          defanged: raw,
          tier: 'discriminating',
          tier_heuristic: 'discriminating',
          tier_basis: 'wallet_high_entropy',
          _offset: idx,
        });
      }
    }
  }

  // ── PASS 5: Sockets (host:port) ───────────────────────────────────────────
  // Emit the HOST as the indicator; port stored as a field.
  {
    const pattern = new RegExp(SOCKET_PATTERN.source, SOCKET_PATTERN.flags);
    for (const { match, host, portNum } of socketMatches(refangedText, pattern, consumed)) {
      const idx = match.index;
      consumed.push([idx, idx + match[0].length]);

      // Classify host as ip or domain
      const ipMatch =
        /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/.test(host);

      if (ipMatch) {
        let tier: IocTier;
        let basis: string;
        if (isPrivateIp(host)) {
          tier = 'reference';
          basis = 'private_ip';
        } else if (defangedIps.has(host)) {
          tier = 'discriminating';
          basis = 'defanged_source';
        } else {
          tier = 'uncertain';
          basis = 'uncertain_default';
        }
        const dedupKey = `ip:${host}`;
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          const ioc: WorkingIoc = {
            type: 'ip',
            value: host,
            defanged: defangValue('ip', host, defang),
            tier,
            tier_heuristic: tier,
            tier_basis: basis,
            port: portNum,
            _offset: idx,
          };
          iocs.push(ioc);
          iocByKey.set(dedupKey, ioc);
        } else {
          // Already seen (e.g. derived from CIDR pass or atomic pass) — merge port if
          // the existing entry has no port yet (first socket wins).
          const existing = iocByKey.get(dedupKey);
          if (existing && existing.port === undefined) {
            existing.port = portNum;
          }
        }
      } else {
        // Domain host — run through domain filter pipeline
        const result = classifyDomain(host, defangedDomains, urlHosts);
        if (result.emit) {
          const dedupKey = `domain:${host}`;
          if (!seen.has(dedupKey)) {
            seen.add(dedupKey);
            const ioc: WorkingIoc = {
              type: 'domain',
              value: host,
              defanged: defangValue('domain', host, defang),
              tier: result.tier,
              tier_heuristic: result.tier,
              tier_basis: result.basis,
              port: portNum,
              _offset: idx,
            };
            iocs.push(ioc);
            iocByKey.set(dedupKey, ioc);
          } else {
            // Merge port onto existing domain IOC if not yet set.
            const existing = iocByKey.get(dedupKey);
            if (existing && existing.port === undefined) {
              existing.port = portNum;
            }
          }
        }
      }
    }
  }

  // ── PASS 6: Atomic pass on unconsumed spans ───────────────────────────────
  // Mask consumed spans so regexes don't match inside compound structures.
  const remainderText = maskConsumedSpans(refangedText, consumed);

  // Hashes
  {
    const matches = remainderText.match(new RegExp(HASH_PATTERN.source, HASH_PATTERN.flags)) ?? [];
    for (const raw of matches) {
      const value = raw.toLowerCase();
      pushIoc({
        type: 'hash',
        value,
        defanged: value,
        tier: 'discriminating',
        tier_heuristic: 'discriminating',
        tier_basis: 'hash_high_entropy',
      });
    }
  }

  // IPs
  {
    const matches = remainderText.match(new RegExp(IP_PATTERN.source, IP_PATTERN.flags)) ?? [];
    for (const raw of matches) {
      let tier: IocTier;
      let basis: string;
      if (isPrivateIp(raw)) {
        tier = 'reference';
        basis = 'private_ip';
      } else if (defangedIps.has(raw)) {
        tier = 'discriminating';
        basis = 'defanged_source';
      } else {
        tier = 'uncertain';
        basis = 'uncertain_default';
      }
      pushIoc({
        type: 'ip',
        value: raw,
        defanged: defangValue('ip', raw, defang),
        tier,
        tier_heuristic: tier,
        tier_basis: basis,
      });
    }
  }

  // Domains — need matchAll for redaction-adjacency position check.
  // We run on remainder text but need original positions, so we also track
  // which domain tokens in refangedText are inside consumed spans.
  const domainPattern = new RegExp(DOMAIN_PATTERN.source, DOMAIN_PATTERN.flags);
  const candidateDomains: DomainCandidate[] = [];

  for (const match of domainCandidateMatches(refangedText, domainPattern, consumed)) {
    // Steps b–e + discriminating classification.
    const raw = match[0].toLowerCase();
    const result = classifyDomain(raw, defangedDomains, urlHosts);
    if (result.emit) {
      candidateDomains.push({
        domain: raw,
        tier: result.tier,
        basis: result.basis,
        offset: match.index,
      });
    }
  }

  // Step f — longest-match PSL dedup (reference/denied candidates are exempt).
  const filteredDomains = longestMatchDomainDedup(candidateDomains);
  for (const { domain, tier, basis, offset } of filteredDomains) {
    const dedupKey = `domain:${domain}`;
    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      iocs.push({
        type: 'domain',
        value: domain,
        defanged: defangValue('domain', domain, defang),
        tier,
        tier_heuristic: tier,
        tier_basis: basis,
        _offset: offset,
      });
    }
  }

  // ── Section override post-pass ────────────────────────────────────────────
  // Runs only when the input text contains ## headings (HTML path). Plain-text
  // fallback produces no section spans, leaving all tier assignments unchanged.
  applySectionOverrides(iocs, classifySectionSpans(refangedText), refangedText);

  // Sorted-set fingerprint of the anchor-eligible IOC values in this report.
  // Only discriminating / contextual / uncertain tiers are hashed — reference and
  // denied items are noise-tagged entries that must not affect the fingerprint used
  // for cross-report correlation (adding a denylist hit to a document should not
  // change whether two reports are considered to share infrastructure).
  // `value` is already normalized (lowercase for domain/url/hash); the .toLowerCase()
  // call is a safety net for ip and future types.
  const anchorEligible = iocs.filter((ioc) => ioc.tier !== 'reference' && ioc.tier !== 'denied');
  const iocSetHash =
    anchorEligible.length === 0
      ? null
      : createHash('sha256')
          .update(
            anchorEligible
              .map((ioc) => ioc.value.toLowerCase())
              .sort()
              .join('\n')
          )
          .digest('hex');

  const cleanedIocs: ExtractedIoc[] = iocs.map(({ _offset: _, ...rest }) => rest);

  return {
    count: cleanedIocs.length,
    iocs: cleanedIocs,
    ioc_set_hash: iocSetHash,
  };
};
