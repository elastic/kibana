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
 * Pure leaf module — no imports from text.ts, extract_iocs.ts, or any other threat_intelligence
 * module, so it cannot participate in a circular dependency.
 *
 * To add a new vendor heading convention: add the normalized form to IOC_HEADER_TERMS or
 * TERMINATOR_HEADER_TERMS (or add a prefix to TERMINATOR_PREFIXES). Both consumers pick it
 * up automatically.
 */

/**
 * Normalize a raw heading string before classification.
 *
 * Steps (applied in order):
 *   1. lowercase
 *   2. strip trailing parenthetical — e.g. " (IOCs)" so "Indicators of Compromise (IOCs)" → "indicators of compromise"
 *   3. strip trailing punctuation/whitespace — e.g. "Sources:" → "sources"
 *   4. collapse internal whitespace — handles any double-spaces left by step 2
 */
export const normalizeHeader = (header: string): string =>
  header
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[:\.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Normalized header strings that declare an Indicators-of-Compromise block. */
export const IOC_HEADER_TERMS = new Set([
  'indicators of compromise',
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
 * Classify a raw heading string into its section kind.
 * Applies normalizeHeader internally — callers pass the raw heading text.
 */
export const classifyHeader = (raw: string): SectionKind => {
  const n = normalizeHeader(raw);
  if (IOC_HEADER_TERMS.has(n)) return 'ioc';
  if (TERMINATOR_HEADER_TERMS.has(n) || TERMINATOR_PREFIXES.some((p) => n.startsWith(p)))
    return 'references';
  return 'prose';
};
