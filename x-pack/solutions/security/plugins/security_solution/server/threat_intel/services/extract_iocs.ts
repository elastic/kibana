/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { isNonRoutableIPv4, isPlaceholderEmailHost } from '@kbn/alertzero-common';
import { type IocType, MAX_URL_LENGTH } from '../../../common/threat_intel';
import { IANA_TLDS } from '../data/iana_tlds';
import { IOC_NOISE_DOMAINS } from '../data/ioc_noise_domains';
import { classifyHeader } from './section_headers';

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
  /**
   * URL/domain/hash kept at a heuristic promotable tier because semantic review
   * did not run (batch budget / overflow). Promote must skip these; they are not
   * a model rejection.
   */
  deferred_unreviewed?: boolean;
  /**
   * Source-text window around the best occurrence of this value (url/domain/hash),
   * for semantic adjudication to judge without re-finding the value in the
   * article. Prompt-only: stripped before the result reaches persistence.
   */
  context?: string;
}

type WorkingIoc = ExtractedIoc & {
  _offset?: number;
  _sectionKind?: SectionKind;
  _hasAttributionCue?: boolean;
};

/** Chars of source text kept on each side of a value when building its context window. */
const CONTEXT_WINDOW_CHARS = 240;

/**
 * Prefer an occurrence whose surrounding prose looks like attacker attribution
 * over a bare first hit (often a citation). Among ties, prefer the later
 * occurrence so a mid/late campaign write-up wins over an early docs link.
 */
const ATTRIBUTION_CONTEXT_CUE =
  /\b(attacker|adversary|c2|c&c|payload|malware|downloaded|beacon|exfiltrat|command.?and.?control|infrastructure|dropper|staged)\b/i;

const windowAround = (source: string, offset: number, length: number, radius: number): string =>
  source.slice(Math.max(0, offset - radius), Math.min(source.length, offset + length + radius));

// Exclude the matched span itself: a value like "/payload" or "evil-dropper.com"
// would otherwise satisfy its own cue regardless of the surrounding prose, making
// every occurrence of such a value look attributed and collapsing the tie-break
// to "prefer the later occurrence" no matter which one actually has attribution.
const hasAttributionCue = (source: string, offset: number, length: number): boolean => {
  const before = source.slice(Math.max(0, offset - CONTEXT_WINDOW_CHARS), offset);
  const after = source.slice(
    offset + length,
    Math.min(source.length, offset + length + CONTEXT_WINDOW_CHARS)
  );
  return ATTRIBUTION_CONTEXT_CUE.test(before) || ATTRIBUTION_CONTEXT_CUE.test(after);
};

export interface ExtractIocsResult {
  /** How many IOCs were found, before the nested-object cap. */
  count: number;
  iocs: ExtractedIoc[];
  ioc_set_hash: string | null;
  /**
   * Set when `count` exceeded `MAX_IOCS_PER_REPORT` and `iocs` was truncated. Present
   * only when it happened, so the common case stays a three-key object.
   */
  truncated?: true;
}

// ── Atomic patterns ────────────────────────────────────────────────────────────
const HASH_PATTERN = /\b([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/gi;
// IPv4 dotted quad with octet bounds; IPv6 left out (false-positive prone).
// Four parts of a longer dotted number are not an address: a quad preceded by a digit and a
// dot, or followed by a dot and a digit, never matches (`3.0.4.2` inside `<=3.0.4.2.0` is a
// version, not an IP). A sentence period (`at 185.220.101.4.`) still matches. The packet-capture
// `host.port` form is the one exception; see `neutralizeCapturePorts`.
const IP_PATTERN =
  /(?<!\d\.)\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b(?!\.\d)/g;
// Domain: 2+ labels, last label 2+ alpha chars.
const DOMAIN_PATTERN = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi;
// The terminal class excludes whitespace, angle brackets, and quotes. Sentence
// punctuation is stripped afterwards by `trimUrlPunctuation`, because it cannot be
// excluded here without also rejecting the many legitimate URLs that end in `)`
// or `.` inside a path or query.
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']{4,}/gi;

/**
 * Trailing characters that are almost always prose rather than part of the URL.
 *
 * `Download https://evil.example/payload.` used to store and promote the URL with
 * the sentence period attached, which never matches the URL in real telemetry.
 * Closing brackets are only trimmed when they are unbalanced, so a Wikipedia-style
 * `.../Foo_(bar)` path survives.
 */
// Backticks delimit Markdown inline code. If retained, URL serialization turns
// one into `%60`, producing an indicator that can never match the source URL.
const TRAILING_PROSE_CHARS = '.,;:!?\'"`';
const CLOSER_TO_OPENER: Readonly<Record<string, string>> = { ')': '(', ']': '[', '}': '{' };

const trimUrlPunctuation = (url: string): string => {
  const counts: Record<string, number> = { '(': 0, ')': 0, '[': 0, ']': 0, '{': 0, '}': 0 };
  for (const char of url) {
    if (char in counts) counts[char] += 1;
  }

  let end = url.length;
  while (end > 0) {
    const last = url[end - 1];
    if (TRAILING_PROSE_CHARS.includes(last)) {
      end -= 1;
    } else {
      const opener = CLOSER_TO_OPENER[last];
      if (opener === undefined || counts[last] <= counts[opener]) break;
      counts[last] -= 1;
      end -= 1;
    }
  }
  return url.slice(0, end);
};

/**
 * Dedup key for an extracted IOC.
 *
 * Folding case is right for domains, hashes, emails, and IPs, which are
 * case-insensitive identifiers. It is wrong for a URL, whose path and query are
 * not, and for a Base58 wallet address, which encodes information in its case.
 * Folding those collapsed two genuinely different indicators into one and dropped
 * the second, which is the same mistake the promote task made when it built the
 * document id.
 */
/**
 * Longest value that can still be a real indicator. Matches `MAX_URL_LENGTH`, the
 * bound the report and source APIs already enforce on a URL, which is the longest
 * IOC type by a wide margin (a domain caps at 253, an email at 254, a hash at 128).
 */
const MAX_IOC_VALUE_LENGTH = MAX_URL_LENGTH;

/** RFC 1035 maximum length for a DNS name. Reject before suffix dedup to avoid quadratic work. */
const MAX_DOMAIN_LENGTH = 253;

/**
 * Most IOCs one report may carry.
 *
 * `extracted.iocs` is a `nested` field, so every entry is its own Lucene document and
 * the reports index leaves `index.mapping.nested_objects.limit` at the Elasticsearch
 * default of 10,000. Crossing it does not drop the extra IOCs, it rejects the entire
 * report document, so the report stays `pending` and every enrichment run re-tries it.
 *
 * Reachable from one 5,000,000-character analyst paste or a dense feed item; every
 * current path writes a single document. 5,000 is the per-document budget the retired
 * `text_indicator_list` adapter chunked to, kept so historical reports and new ones share
 * one bound.
 */
const MAX_IOCS_PER_REPORT = 5_000;

/** Most promotable first. Only consulted when a report has to be truncated. */
const TIER_RANK: readonly string[] = [
  'discriminating',
  'contextual',
  'uncertain',
  'reference',
  'denied',
];

const iocDedupKey = (type: IocType, value: string): string =>
  `${type}:${type === 'url' || type === 'wallet' ? value : value.toLowerCase()}`;

/**
 * Case-normalizes a URL without touching the parts that are case-sensitive.
 *
 * Lowercasing the whole URL made `/PAYLOAD/Stage2.exe` into
 * `/payload/stage2.exe`, so the promoted indicator no longer matched telemetry
 * carrying the real URL. Scheme and host are case-insensitive and worth folding;
 * path, query, and fragment are not. `URL` preserves those parts while
 * canonicalizing scheme and host.
 */
const normalizeUrlCase = (url: string): string => {
  try {
    return new URL(url).toString();
  } catch {
    return url;
  }
};

// ── Compound patterns ──────────────────────────────────────────────────────────
// email: local-part @ host (with optional defanged [.] in host)
// local-part: printable non-whitespace non-@ chars
const EMAIL_PATTERN = /\b[a-z0-9._%+\-]+@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z]{2,24}\b/gi;

// Message-ID headers have the shape of an address (`<20261001.6272F1@mail.lab.test>`) but name
// a message, not a mailbox. An ID header name is any name ending in message-id, message_id,
// messageid or msgid (Message-ID, Resent-Message-ID, InternetMessageId, postfix `message-id=`,
// sendmail `msgid=`), followed by an optional closing quote, `:` or `=`, optional whitespace
// and an optional opening quote.
const ID_HEADER_BEFORE_TOKEN = /(?:message[-_]?id|msgid)["']?[ \t]*[:=][ \t]*["']?$/i;
// A line that is a References or In-Reply-To header and nothing but its bracketed tokens, which
// are then all message IDs. Reports also use `References:` as a label, so a line with any other
// text (`References: reported by <actor@evil.com>`) is not one. A line starts at the start of
// the text or after `\n`.
const ID_LIST_HEADER_LINE =
  /(?<![^\n])[ \t]*(?:in-reply-to|references)[ \t]*:[ \t]*(?:<[^<>\s]+>[ \t\r,]*)+(?![^\n])/gi;
// An ID token and the header name before it are short, so only this much text on either side of
// a match is read (998 is the RFC 5322 line limit). The report text is untrusted and the check
// runs once per email match, so reading the whole line would be quadratic on one long line.
const MAX_ID_TOKEN_CONTEXT_CHARS = 998;

/** Every ID list header line, in text order. One linear scan per extraction. */
const collectIdListHeaderLines = (text: string): Span[] => {
  const pattern = new RegExp(ID_LIST_HEADER_LINE.source, ID_LIST_HEADER_LINE.flags);
  const lines: Span[] = [];
  for (const match of matchesWithOffset(text, pattern)) {
    lines.push([match.index, match.index + match[0].length]);
  }
  return lines;
};

/** True when `offset` is inside one of `spans`, which are sorted and do not overlap. */
const isInsideSortedSpans = (spans: readonly Span[], offset: number): boolean => {
  let low = 0;
  let high = spans.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const [spanStart, spanEnd] = spans[middle];
    if (offset < spanStart) {
      high = middle - 1;
    } else if (offset >= spanEnd) {
      low = middle + 1;
    } else {
      return true;
    }
  }
  return false;
};

/**
 * True when the email match at `[start, end)` sits inside a token a mail Message-ID header
 * introduces. Same line only: a folded header whose ID is on the next line is not recognized.
 * The check runs on the enclosing `<...>` or `"..."` token, not on the match, because an ID
 * local part can hold characters EMAIL_PATTERN stops at (`=`), so the match may start mid-token.
 * The token is found from the nearest bracket or quote on each side, never by counting quotes
 * back to the line start, so the result does not depend on where the window begins.
 */
const isMessageIdToken = (
  text: string,
  start: number,
  end: number,
  idListHeaderLines: readonly Span[]
): boolean => {
  const lookBehind = text.slice(Math.max(0, start - MAX_ID_TOKEN_CONTEXT_CHARS), start);
  const before = lookBehind.slice(lookBehind.lastIndexOf('\n') + 1);
  const lookAhead = text.slice(end, end + MAX_ID_TOKEN_CONTEXT_CHARS);
  const newlineAfter = lookAhead.indexOf('\n');
  const after = newlineAfter === -1 ? lookAhead : lookAhead.slice(0, newlineAfter);

  const lt = before.lastIndexOf('<');
  if (lt > before.lastIndexOf('>') && after.includes('>')) {
    return (
      ID_HEADER_BEFORE_TOKEN.test(before.slice(0, lt)) ||
      isInsideSortedSpans(idListHeaderLines, start)
    );
  }

  // A quoted token: the nearest quote on each side, with no whitespace between it and the match.
  const openingQuote = before.lastIndexOf('"');
  const closingQuote = after.indexOf('"');
  return (
    openingQuote !== -1 &&
    closingQuote !== -1 &&
    !/\s/.test(before.slice(openingQuote + 1)) &&
    !/\s/.test(after.slice(0, closingQuote)) &&
    ID_HEADER_BEFORE_TOKEN.test(before.slice(0, openingQuote))
  );
};

/**
 * True when the report wrote the `@` of this match defanged (`actor[@]evil[.]com`). Only the
 * text touching the `@` is compared, from the last dot of the local part to the first dot of
 * the host, so a defanged dot on either side (`20261001[.]6272F1@mail[.]evil[.]com`) does not
 * count.
 */
const isAtSignDefanged = (raw: string, originalLower: string): boolean => {
  const at = raw.lastIndexOf('@');
  const aroundAt = raw.slice(raw.lastIndexOf('.', at) + 1, raw.indexOf('.', at));
  return !originalLower.includes(aroundAt);
};

/** Tier and basis for an email match, or `null` when it is not an address (rules 1 and 3 of PASS 1). */
const classifyEmail = ({
  refangedText,
  originalLower,
  start,
  raw,
  wasDefanged,
  idListHeaderLines,
}: {
  refangedText: string;
  originalLower: string;
  start: number;
  raw: string;
  wasDefanged: boolean;
  idListHeaderLines: readonly Span[];
}): { tier: IocTier; basis: string } | null => {
  // A defanged `@` means the report is writing an address, whatever header precedes it. Defanged
  // dots do not: phishing write-ups paste header blocks with every domain defanged
  // (`Message-ID: <id@mail.evil[.]com>`), and those are still message IDs.
  const isMessageId =
    isMessageIdToken(refangedText, start, start + raw.length, idListHeaderLines) &&
    !isAtSignDefanged(raw, originalLower);
  if (isMessageId) return null;
  const host = raw.slice(raw.lastIndexOf('@') + 1);
  if (isPlaceholderEmailHost(host)) return { tier: 'reference', basis: 'placeholder_email' };
  if (!IANA_TLDS.has(host.slice(host.lastIndexOf('.') + 1))) return null;
  // Defanged-in-source (the @ or a dot was rebuilt by refang) → discriminating, like a defanged domain.
  return wasDefanged
    ? { tier: 'discriminating', basis: 'defanged_source' }
    : { tier: 'uncertain', basis: 'uncertain_default' };
};

// CIDR: IPv4/mask (defang already applied before this runs). A mask followed by a dot and a
// digit is not a range (`2.1.0.3/2.1.0.4` is two versions). The leading boundary matches
// IP_PATTERN's, so `1.3.4.2.1/24` does not yield `3.4.2.1/24`.
const CIDR_PATTERN =
  /(?<!\d\.)\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\/(?:3[0-2]|[12]?\d)\b(?!\.\d)/g;

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
// The leading boundary matches IP_PATTERN's, so `1.3.4.2.1:8080` does not yield `3.4.2.1`.
const SOCKET_PATTERN = new RegExp(`(?<!\\d\\.)\\b(${IPV4}|${DOMAIN_HOST}):(\\d{1,5})\\b`, 'gi');

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
  const bounded = candidates.filter((c) => c.domain.length <= MAX_DOMAIN_LENGTH);
  const domains = Array.from(new Set(bounded.map((c) => c.domain)));
  const subsumed = new Set<string>();
  for (const domain of domains) {
    let dot = domain.indexOf('.');
    while (dot >= 0) {
      subsumed.add(domain.slice(dot + 1));
      dot = domain.indexOf('.', dot + 1);
    }
  }

  return bounded.filter((c) => {
    // Always keep reference/denied — they are observability entries, not anchors.
    if (c.tier === 'reference' || c.tier === 'denied') return true;
    return !subsumed.has(c.domain);
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
/**
 * Recover defanged IOC spellings (`hxxps`, `evil[.]com`, …) to their canonical
 * form. Exported so adjudication can locate canonical candidate values in the
 * same refanged view that extraction uses.
 */
export const refang = (text: string): string =>
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

const mergeSpans = (spans: readonly Span[]): Span[] => {
  const sorted = [...spans].sort(([left], [right]) => left - right);
  const merged: Span[] = [];
  for (const span of sorted) {
    const previous = merged[merged.length - 1];
    if (previous === undefined || span[0] > previous[1]) {
      merged.push(span);
    } else if (span[1] > previous[1]) {
      merged[merged.length - 1] = [previous[0], span[1]];
    }
  }
  return merged;
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
  const spans = mergeSpans(consumed);
  let spanIndex = 0;
  for (const match of matchesWithOffset(text, pattern)) {
    while (spanIndex < spans.length && spans[spanIndex][1] <= match.index) {
      spanIndex += 1;
    }
    const span = spans[spanIndex];
    const isConsumed =
      span !== undefined && match.index >= span[0] && match.index + match[0].length <= span[1];
    if (!isConsumed) {
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

const STRUCTURED_HEADING_PATTERN = /^##[ \t]+(.+?)\r?$/;

/**
 * Segment structured text into labelled section spans.
 * The producer contract is one level-two Markdown heading per source heading,
 * beginning at column zero and separated from its text by ASCII space or tab.
 * Other Markdown heading levels and prose blocks do not delimit sections.
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
    const headingMatch = STRUCTURED_HEADING_PATTERN.exec(line);
    if (headingMatch) {
      if (currentKind !== null) {
        spans.push({ start: currentStart, end: offset, kind: currentKind });
        currentKind = null;
      }
      const headerKind = classifyHeader(headingMatch[1]);
      if (headerKind === 'ioc' || headerKind === 'references') {
        currentKind = headerKind;
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

const sectionKindAtOffset = (
  offset: number | undefined,
  spans: readonly SectionSpan[]
): SectionKind | undefined => {
  if (offset === undefined) return undefined;
  let low = 0;
  let high = spans.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const span = spans[middle];
    if (offset < span.start) {
      high = middle - 1;
    } else if (offset >= span.end) {
      low = middle + 1;
    } else {
      return span.kind;
    }
  }
  return undefined;
};

// ── Packet-capture `host.port` ──────────────────────────────────────────────────
// tcpdump and netstat write a socket as `10.0.0.5.51234`, which the longer-dotted-number rule
// would otherwise reject. On a line carrying a capture marker the `.port` part is blanked out
// (same length, so offsets are unchanged) and the quad is left to the ordinary passes. A marker:
//   - the tcpdump protocol word (`IP ` / `IP6 `) directly before a `quad.port` token;
//   - a tcpdump flow, `quad.port > quad.port:` with the trailing colon, anywhere on the line;
//   - a BSD netstat row: a protocol column at the start of the line (`tcp`, `tcp4`, `udp6`,
//     `tcp46`, lower case), the two queue counters, then a `quad.port` local address. Prose
//     that only starts with `udp 4 ...` is not a row.
// Without a marker the five-part rule wins. Solaris `netstat -an` rows (no protocol column) and
// `ip.port -> ip.port` text without a marker yield no IP.
const QUAD_PORT = new RegExp(`(?<!\\d\\.)\\b(${IPV4})(\\.\\d{1,5})\\b(?!\\.\\d)`, 'g');
const TCPDUMP_PROTOCOL = new RegExp(`\\bIP6? ${IPV4}\\.\\d`);
const TCPDUMP_FLOW = new RegExp(`${IPV4}\\.\\d{1,5}\\s*>\\s*${IPV4}\\.\\d{1,5}:`);
const NETSTAT_ROW = new RegExp(
  `^[ \\t]*(?:tcp|udp)(?:46|4|6)?[ \\t]+\\d+[ \\t]+\\d+[ \\t]+${IPV4}\\.\\d{1,5}(?![\\d.])`
);

const hasCaptureMarker = (line: string): boolean =>
  TCPDUMP_PROTOCOL.test(line) || TCPDUMP_FLOW.test(line) || NETSTAT_ROW.test(line);

const neutralizeCapturePorts = (text: string): string =>
  text.replace(/^.*$/gm, (line) =>
    hasCaptureMarker(line)
      ? line.replace(
          QUAD_PORT,
          (_match, quad: string, port: string) => quad + ' '.repeat(port.length)
        )
      : line
  );

// ── Version numbers ─────────────────────────────────────────────────────────────
// A `vers:` token is a version range specifier (`vers:intdot/>=8.2.0.1|<8.2.0.5`). Nothing inside
// one is an indicator, bare numbers listed after one are more versions, and every dotted quad
// found this way is a value the report itself marks as a version. Only these spans mark a value.
const VERS_TOKEN_START = /(?<![A-Za-z0-9])vers:[A-Za-z0-9.+-]+\//gi;
const VERS_TOKEN_TERMINATOR = /[\s,;)\]"']/;
const VERS_COMPARISON_CHARS = '<>=!';
const VERS_LIST_CONTINUATION = /[ \t]*,[ \t]*\d+(?:\.\d+)+(?![A-Za-z0-9_])/y;

interface VersionSpans {
  readonly spans: readonly Span[];
  readonly markedValues: ReadonlySet<string>;
}

/** End of the `vers:` token whose `vers:scheme/` prefix ends at `from`, list continuation included. */
const versionSpanEnd = (text: string, from: number): number => {
  let end = from;
  // Token: runs to whitespace, comma, semicolon, `)`, `]` or a quote. `<` and `>` are part of
  // a constraint. It runs past `|` only when a comparison character follows.
  while (end < text.length && !VERS_TOKEN_TERMINATOR.test(text[end])) {
    if (text[end] === '|' && !VERS_COMPARISON_CHARS.includes(text[end + 1] ?? ' ')) break;
    end++;
  }
  // List continuation: bare dotted numbers after `,` on the same line.
  for (;;) {
    VERS_LIST_CONTINUATION.lastIndex = end;
    if (!VERS_LIST_CONTINUATION.test(text)) break;
    end = VERS_LIST_CONTINUATION.lastIndex;
  }
  return end;
};

const collectVersionSpans = (text: string): VersionSpans => {
  const spans: Span[] = [];
  const markedValues = new Set<string>();
  let coveredTo = 0;
  for (const match of text.matchAll(VERS_TOKEN_START)) {
    const start = match.index ?? 0;
    // A `vers:` inside the previous token (`vers:a/vers:b/...`) ends where that token ends, so
    // its span is already recorded. Skipping it keeps a run of them linear.
    if (start >= coveredTo) {
      const end = versionSpanEnd(text, start + match[0].length);
      spans.push([start, end]);
      coveredTo = end;
      for (const quad of text.slice(start, end).match(new RegExp(IP_PATTERN.source, 'g')) ?? []) {
        markedValues.add(quad);
      }
    }
  }
  return { spans, markedValues };
};

// Version wording before an occurrence: a version word (not preceded by a letter or digit, so
// `product_version` counts and `server.` does not), then optionally a closing quote, `:` or `=`,
// one filler word, and an opening quote or `(`, all on the same line.
const VERSION_WORD_BEFORE =
  /(?<![A-Za-z0-9])(?:versions?|ver\.)[ \t]*["']?[ \t]*[:=]?[ \t]*(?:(?:before|prior to|up to|through|from|between|including|below|above)[ \t]*)?["'(]?[ \t]*$/i;
const QUAD_JOINED_BEFORE =
  /(\d{1,3}(?:\.\d{1,3}){3})(?:[ \t]+and[ \t]+(?:prior|earlier|later|below|above))?(?:[ \t]*[,/][ \t]*|[ \t]+(?:and|or|through|to)[ \t]+)$/i;
const MAX_VERSION_JOIN_DEPTH = 50;
// Version wording and a joined occurrence sit directly before the value, in well under this many
// characters. Reading no further back keeps a long line of occurrences linear.
const VERSION_CONTEXT_LOOKBEHIND_CHARS = 96;

/**
 * True when the occurrence at `offset` reads as a version: version wording before it, a
 * comparison operator touching it, or it is joined (`,`, `/`, `and`, `or`, `through`, `to`) to
 * another occurrence that does. Reads `text` (the refanged text, not the masked remainder), same
 * line only. Wording is only trusted for a value the report already marked with a `vers:` token.
 */
const isVersionContext = (text: string, offset: number, depth = 0): boolean => {
  const windowStart = Math.max(0, offset - VERSION_CONTEXT_LOOKBEHIND_CHARS);
  const lookBehind = text.slice(windowStart, offset);
  const newlineBefore = lookBehind.lastIndexOf('\n');
  const lineStart = windowStart + newlineBefore + 1;
  const before = text.slice(lineStart, offset);
  // When the window is cut mid-line, a match at its first character may be the tail of a longer
  // word or number (`subversion`, `10.9.2.1.6`), so it does not count.
  const isCutMidLine = newlineBefore === -1 && windowStart > 0 && text[windowStart - 1] !== '\n';
  const isWholeMatch = (match: RegExpExecArray | null): match is RegExpExecArray =>
    match !== null && (match.index > 0 || !isCutMidLine);
  if (isWholeMatch(VERSION_WORD_BEFORE.exec(before))) return true;
  if (/(?:<=|>=|≤|≥)$/.test(before)) return true;
  if (depth >= MAX_VERSION_JOIN_DEPTH) return false;
  const joined = QUAD_JOINED_BEFORE.exec(before);
  return isWholeMatch(joined) && isVersionContext(text, lineStart + joined.index, depth + 1);
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
 *
 * Placeholder emails (tier_basis 'placeholder_email') are exempt from both: an
 * example address stays reference under an IOC heading, and its basis is not
 * rewritten to references_section under a References heading.
 */
/**
 * The tier/basis a containing section imposes, or `null` to keep the per-value
 * heuristic verdict.
 */
const sectionOverrideFor = (
  ioc: WorkingIoc,
  kind: SectionKind
): { tier: IocTier; basis: string } | null => {
  if (ioc.tier_basis === 'placeholder_email') {
    return null;
  }
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

const applySectionOverrides = (iocs: readonly WorkingIoc[]): void => {
  for (const ioc of iocs) {
    const override =
      ioc._sectionKind === undefined ? null : sectionOverrideFor(ioc, ioc._sectionKind);
    if (override) {
      ioc.tier = override.tier;
      ioc.tier_basis = override.basis;
    }
  }
};

export const extractIocs = ({ text, defang = true }: ExtractIocsParams): ExtractIocsResult => {
  // Pre-pass: recover defanged IOCs before regex matching.
  const refangedText = neutralizeCapturePorts(refang(text));
  const sectionSpans = classifySectionSpans(refangedText);
  const seen = new Set<string>();
  const iocByKey = new Map<string, WorkingIoc>();
  const iocs: WorkingIoc[] = [];
  const consumed: Span[] = [];

  // ── Corroboration signal 1: defanged-in-source domains ───────────────────
  // A domain present in refangedText but absent from the original text was
  // created BY refang, meaning the vendor deliberately defanged it — strongest
  // possible corroboration that it is a live indicator.
  const originalLower = neutralizeCapturePorts(text).toLowerCase();
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

  const recordSectionKind = (ioc: WorkingIoc, offset: number | undefined): void => {
    const occurrenceKind = sectionKindAtOffset(offset, sectionSpans);
    if (occurrenceKind === 'ioc' || (occurrenceKind === 'references' && !ioc._sectionKind)) {
      ioc._sectionKind = occurrenceKind;
    }
  };

  // Only url/domain/hash candidates ever reach semantic adjudication
  // (isSemanticCandidate in adjudicate_iocs.ts), so only those need a context
  // window tracked across duplicate occurrences.
  const isContextCandidate = (ioc: WorkingIoc): boolean =>
    ioc.type === 'url' || ioc.type === 'domain' || ioc.type === 'hash';

  const pushIoc = (ioc: WorkingIoc): WorkingIoc | undefined => {
    // An over-long value is not a usable indicator and it is actively harmful.
    // `extracted.iocs.value` is a keyword on the reports index, and a keyword term
    // over 32,766 bytes is a hard Elasticsearch error that rejects the whole report
    // document, not just the field. The report then stays `pending`, gets picked up
    // by every enrichment run, and fails again. `body_text` accepts 5,000,000
    // characters and the URL pattern stops only at whitespace, so a single
    // no-whitespace URL was enough to produce one.
    //
    // Dropped rather than truncated: a truncated URL or hash is a different value,
    // and publishing it as an indicator would be worse than publishing nothing.
    if (ioc.value.length > MAX_IOC_VALUE_LENGTH) return undefined;
    const dedupKey = iocDedupKey(ioc.type, ioc.value);
    const existing = iocByKey.get(dedupKey);
    if (existing) {
      recordSectionKind(existing, ioc._offset);
      if (isContextCandidate(ioc) && ioc._offset !== undefined) {
        const cue = hasAttributionCue(refangedText, ioc._offset, ioc.value.length);
        const existingOffset = existing._offset;
        const existingCue = existing._hasAttributionCue ?? false;
        if (
          existingOffset === undefined ||
          (cue && !existingCue) ||
          (cue === existingCue && ioc._offset > existingOffset)
        ) {
          existing._offset = ioc._offset;
          existing._hasAttributionCue = cue;
        }
      }
      return existing;
    }
    if (isContextCandidate(ioc) && ioc._offset !== undefined) {
      ioc._hasAttributionCue = hasAttributionCue(refangedText, ioc._offset, ioc.value.length);
    }
    recordSectionKind(ioc, ioc._offset);
    seen.add(dedupKey);
    iocs.push(ioc);
    iocByKey.set(dedupKey, ioc);
    return ioc;
  };

  // ── PASS 1: emails ────────────────────────────────────────────────────────
  // Full address is the indicator; host-domain is suppressed (mail provider noise).
  // First rule that applies wins, and every match records its span in `consumed` so the
  // host of a skipped match never resurfaces as a domain:
  //   1. Message-ID token (`message-id=<id@host>`, `References: <a@b> <c@d>`) → nothing, unless
  //      the report wrote its `@` defanged. A References or In-Reply-To line under an IOC
  //      heading is not an ID list.
  //   2. Placeholder host (`test@test.com`, `a@b.lab.test`) → reference/placeholder_email,
  //      even when defanged. Runs before rule 3 because reserved TLDs are not in IANA_TLDS.
  //   3. Host TLD is not a real TLD → nothing. Trade-off: a real address glued to the next
  //      word (`actor@evil.comwill`) is lost rather than repaired, since the right cut point
  //      is ambiguous (`.co`, `.com` and `.cool` are all TLDs).
  //   4. Otherwise: discriminating if defanged in the source, else uncertain.
  {
    const pattern = new RegExp(EMAIL_PATTERN.source, EMAIL_PATTERN.flags);
    const idListHeaderLines = collectIdListHeaderLines(refangedText);
    for (const match of matchesWithOffset(refangedText, pattern)) {
      const raw = match[0].toLowerCase();
      const idx = match.index;
      consumed.push([idx, idx + match[0].length]);

      const verdict = classifyEmail({
        refangedText,
        originalLower,
        start: idx,
        raw,
        wasDefanged: !originalLower.includes(raw),
        idListHeaderLines:
          sectionKindAtOffset(idx, sectionSpans) === 'ioc' ? [] : idListHeaderLines,
      });
      if (verdict) {
        pushIoc({
          type: 'email',
          value: raw,
          defanged: defangValue('email', raw, defang),
          tier: verdict.tier,
          tier_heuristic: verdict.tier,
          tier_basis: verdict.basis,
          _offset: idx,
        });
      }
    }
  }

  // ── PASS 2: URLs ──────────────────────────────────────────────────────────
  const rawUrls: string[] = [];
  const rawUrlOffsets: number[] = [];
  {
    const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
    for (const match of matchesWithOffset(refangedText, pattern)) {
      const trimmed = trimUrlPunctuation(match[0]);
      const raw = normalizeUrlCase(trimmed);
      const idx = match.index;
      // Only the trimmed span is consumed, so a trailing `.` stays available to
      // the passes that follow.
      consumed.push([idx, idx + trimmed.length]);
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
  const urlHostsWithOffsets = rawUrls.flatMap((url, index) => {
    try {
      return [{ host: new URL(url).hostname.toLowerCase(), offset: rawUrlOffsets[index] }];
    } catch {
      return [];
    }
  });
  const urlHostList = urlHostsWithOffsets.map(({ host }) => host);
  const urlHosts: ReadonlySet<string> = new Set(urlHostList);

  // Derive URL host domains as explicit IOCs (like CIDR → bare IP).
  // The URL consumes its span; the host must be derived explicitly so it
  // isn't lost. Run through domain filter pipeline — urlHosts corroboration
  // means ambiguous TLDs (evil.py) correctly pass the gate here.
  for (const { host, offset } of urlHostsWithOffsets) {
    const result = classifyDomain(host, defangedDomains, urlHosts);
    if (result.emit) {
      pushIoc({
        type: 'domain',
        value: host,
        defanged: defangValue('domain', host, defang),
        tier: result.tier,
        tier_heuristic: result.tier,
        tier_basis: result.basis,
        _offset: offset,
      });
    }
  }

  // ── Version spans ─────────────────────────────────────────────────────────
  // `vers:` tokens and the comma lists continuing them are consumed before the CIDR, socket and
  // bare-IP passes, and the dotted quads inside them are the values the report marks as versions.
  const { spans: versionSpans, markedValues: markedVersionValues } =
    collectVersionSpans(refangedText);
  consumed.push(...versionSpans);

  // A marked value is skipped only in a version context, never under an IOC heading, and never
  // when the report wrote it defanged. An unmarked value is always emitted, whatever the words
  // around it, and a marked value that also appears plainly (`C2 at 9.2.1.6`) is emitted.
  const isMarkedVersionMention = (value: string, offset: number): boolean =>
    markedVersionValues.has(value) &&
    !defangedIps.has(value) &&
    sectionKindAtOffset(offset, sectionSpans) !== 'ioc' &&
    isVersionContext(refangedText, offset);

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

      // The network address decides: a marked version in a version context skips the range and
      // its derived IP.
      if (!isMarkedVersionMention(networkIp, idx)) {
        // CIDR tier: private and reserved space first, then mask width.
        //
        // Mask width alone put 10.20.0.0/16 in `contextual`, which the promote task
        // admits, so an RFC1918 range became a live Indicator Match row and matched
        // essentially all internal traffic. The bare IP derived just below was
        // already classified `reference/private_ip`, so the two disagreed about the
        // same network.
        const isPrivateNetwork = isPrivateIp(networkIp);
        const cidrTier: IocTier = isPrivateNetwork
          ? 'reference'
          : maskWidth >= 29
          ? 'discriminating'
          : 'contextual';
        const cidrBasis = isPrivateNetwork
          ? 'private_ip'
          : maskWidth >= 29
          ? 'cidr_narrow'
          : 'cidr_broad';

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

      if (ipMatch && isMarkedVersionMention(host, idx)) {
        // A marked version followed by `:` (`version 9.2.2.1:2026-10-01`) is not a socket.
      } else if (ipMatch) {
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
        const stored = pushIoc({
          type: 'ip',
          value: host,
          defanged: defangValue('ip', host, defang),
          tier,
          tier_heuristic: tier,
          tier_basis: basis,
          port: portNum,
          _offset: idx,
        });
        if (stored && stored.port === undefined) {
          stored.port = portNum;
        }
      } else {
        // Domain host — run through domain filter pipeline
        const result = classifyDomain(host, defangedDomains, urlHosts);
        if (result.emit) {
          const stored = pushIoc({
            type: 'domain',
            value: host,
            defanged: defangValue('domain', host, defang),
            tier: result.tier,
            tier_heuristic: result.tier,
            tier_basis: result.basis,
            port: portNum,
            _offset: idx,
          });
          if (stored && stored.port === undefined) {
            stored.port = portNum;
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
    const pattern = new RegExp(HASH_PATTERN.source, HASH_PATTERN.flags);
    for (const match of matchesWithOffset(remainderText, pattern)) {
      const value = match[0].toLowerCase();
      pushIoc({
        type: 'hash',
        value,
        defanged: value,
        tier: 'discriminating',
        tier_heuristic: 'discriminating',
        tier_basis: 'hash_high_entropy',
        _offset: match.index,
      });
    }
  }

  // IPs
  {
    const pattern = new RegExp(IP_PATTERN.source, IP_PATTERN.flags);
    for (const match of matchesWithOffset(remainderText, pattern)) {
      const raw = match[0];
      if (!isMarkedVersionMention(raw, match.index)) {
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
          _offset: match.index,
        });
      }
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
    pushIoc({
      type: 'domain',
      value: domain,
      defanged: defangValue('domain', domain, defang),
      tier,
      tier_heuristic: tier,
      tier_basis: basis,
      _offset: offset,
    });
  }

  // ── Section override post-pass ────────────────────────────────────────────
  // Runs only when the input text contains structured ## headings. Ordinary
  // plain text produces no section spans, leaving all tier assignments unchanged.
  applySectionOverrides(iocs);

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

  const cleanedIocs: ExtractedIoc[] = iocs.map(
    ({ _offset, _sectionKind, _hasAttributionCue, ...rest }) => ({
      ...rest,
      ...(rest.type === 'url' || rest.type === 'domain' || rest.type === 'hash'
        ? _offset !== undefined
          ? {
              context: windowAround(refangedText, _offset, rest.value.length, CONTEXT_WINDOW_CHARS),
            }
          : { context: '' }
        : {}),
    })
  );

  // Highest tier first, so a truncated report keeps its most promotable indicators
  // rather than whichever happened to appear earliest in the text.
  const capped =
    cleanedIocs.length > MAX_IOCS_PER_REPORT
      ? [...cleanedIocs]
          .sort((a, b) => TIER_RANK.indexOf(a.tier) - TIER_RANK.indexOf(b.tier))
          .slice(0, MAX_IOCS_PER_REPORT)
      : cleanedIocs;

  return {
    // The count found, not the count returned, so the truncation is visible.
    count: cleanedIocs.length,
    iocs: capped,
    ioc_set_hash: iocSetHash,
    ...(capped.length < cleanedIocs.length ? { truncated: true as const } : {}),
  };
};
