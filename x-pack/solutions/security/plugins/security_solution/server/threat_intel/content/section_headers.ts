/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared heading-classification vocabulary used by:
 *   - adapters/text.ts   (htmlToStructured — scopes anchor-href lift to IOC/References sections)
 *   - services/extract_iocs.ts (classifySectionSpans — assigns section tiers to extracted IOCs)
 *
 * Single source of truth so both consumers classify the same heading strings identically.
 * Pure leaf module — no imports from text.ts, extract_iocs.ts, or any other threat_intel
 * module, so it cannot participate in a circular dependency.
 *
 * To add a new vendor heading convention: add the normalized form to IOC_HEADER_TERMS or
 * TERMINATOR_HEADER_TERMS (or add a prefix to TERMINATOR_PREFIXES). Both consumers pick it
 * up automatically. Either spelling of the final word is enough, since lookup tolerates
 * the singular/plural pair.
 */

/**
 * Normalize a raw heading string before classification.
 *
 * Steps (applied in order):
 *   1. lowercase
 *   2. strip trailing punctuation and a trailing parenthetical, repeatedly
 *   3. collapse internal whitespace
 *
 * Step 2 loops because the two can appear in either order and applying each once lets one
 * block the other. Stripping the parenthetical first meant
 * `Indicators of Compromise (IOCs):` kept it, since the trailing colon defeated the
 * anchored match, and the heading then classified as prose and dropped every indicator
 * beneath it. The same held for `IOCs (updated).` and `References (2024):`, all ordinary
 * vendor formatting.
 *
 * Bounded at four passes rather than run to a fixed point, because headings come from
 * attacker-controlled markup and `(a)(a)(a)…` would otherwise cost one pass per group.
 */
export const normalizeHeader = (header: string): string => {
  let normalized = header.toLowerCase();

  for (let pass = 0; pass < 4; pass++) {
    const stripped = normalized.replace(/[:.\s]+$/, '').replace(/\s*\([^)]*\)\s*$/, '');
    if (stripped === normalized) break;
    normalized = stripped;
  }

  return normalized
    .replace(/[:.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/** Normalized header strings that declare an Indicators-of-Compromise block. */
export const IOC_HEADER_TERMS = new Set([
  'indicators of compromise',
  // Listed explicitly because its plural is internal, so the trailing-word tolerance in
  // `matchesTerm` cannot derive it. Vendors write the singular heading regularly, and it
  // classified as prose, which dropped every href-only indicator beneath it.
  'indicator of compromise',
  'ioc',
  'iocs',
  'indicators',
  'observations',
  'observables',
]);

/**
 * Normalized header strings that terminate an IOC block and tag contained values
 * as references (post-article boilerplate, nav, citations — all non-intelligence).
 */
export const TERMINATOR_HEADER_TERMS = new Set([
  'references',
  'sources',
  'bibliography',
  'further reading',
  'acknowledgements',
  'related articles',
  'similar articles',
  'related posts',
  'read more',
  'post navigation',
  'discussion',
  'comments',
  'share',
  'share article',
  'share this article',
  'newsletter',
  'discover more',
  'about the author',
  'author',
  'jump to section',
  'table of contents',
  'let us keep you up to date',
]);

/**
 * startsWith prefixes for nav headers that may carry trailing text after normalization
 * (e.g. "Related Articles: 2024 Edition" → normalized "related articles: 2024 edition"
 * doesn't match the set, but starts with "related ").
 */
export const TERMINATOR_PREFIXES = ['related ', 'similar ', 'share ', 'about the ', 'discover '];

export type SectionKind = 'ioc' | 'references' | 'prose';

/**
 * Membership that accepts either spelling of the term's final word.
 *
 * The vocabulary was written in whichever number each heading usually appears in, so
 * `indicators` was listed and `indicator` was not, `references` but not `reference`,
 * `observables` but not `observable`. Every one of those gaps silently reclassified a
 * section as prose. Rather than doubling the lists by hand and inevitably missing some,
 * the tolerance lives here, so a term only ever needs one spelling.
 *
 * A term whose plural is not on the final word still needs both forms listed.
 */
const matchesTerm = (terms: Set<string>, normalized: string): boolean => {
  if (terms.has(normalized)) return true;
  if (normalized.endsWith('s') && terms.has(normalized.slice(0, -1))) return true;
  return terms.has(`${normalized}s`);
};

/**
 * Classify a raw heading string into its section kind.
 * Applies normalizeHeader internally — callers pass the raw heading text.
 */
export const classifyHeader = (raw: string): SectionKind => {
  const n = normalizeHeader(raw);
  if (matchesTerm(IOC_HEADER_TERMS, n)) return 'ioc';
  if (matchesTerm(TERMINATOR_HEADER_TERMS, n) || TERMINATOR_PREFIXES.some((p) => n.startsWith(p)))
    return 'references';
  return 'prose';
};
