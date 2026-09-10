/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const IOC_TERMS = new Set([
  'indicator of compromise',
  'indicators of compromise',
  'ioc',
  'iocs',
  'indicators',
  'observations',
  'observables',
]);
const REFERENCE_TERMS = new Set([
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
const REFERENCE_PREFIXES = ['related', 'similar', 'share', 'about the author', 'discover'];
const PREFIX_DELIMITER = /[\s,;:.-]/;

export type SectionKind = 'ioc' | 'references' | 'prose';

const stripTrailingMarks = (value: string): string => {
  let end = value.length;
  while (end > 0 && /[:.\s]/.test(value[end - 1])) end -= 1;
  return value.slice(0, end);
};

const normalizeHeader = (header: string): string => {
  let normalized = header.toLowerCase();
  for (let pass = 0; pass < 4; pass++) {
    const stripped = stripTrailingMarks(normalized).replace(/\([^()]*\)\s*$/, '');
    if (stripped === normalized) break;
    normalized = stripped;
  }
  return stripTrailingMarks(normalized).replace(/\s+/g, ' ').trim();
};

const matchesTerm = (terms: Set<string>, value: string): boolean => {
  if (terms.has(value)) return true;
  if (value.endsWith('s') && terms.has(value.slice(0, -1))) return true;
  if (terms.has(`${value}s`)) return true;
  if (value.endsWith('ies') && terms.has(`${value.slice(0, -3)}y`)) return true;
  return value.endsWith('y') && terms.has(`${value.slice(0, -1)}ies`);
};

const matchesPrefix = (value: string, prefix: string): boolean =>
  value === prefix ||
  (value.startsWith(prefix) && PREFIX_DELIMITER.test(value.charAt(prefix.length)));

/** Classifies a raw report heading for section-aware IOC extraction. */
export const classifyHeader = (header: string): SectionKind => {
  const normalized = normalizeHeader(header);
  if (matchesTerm(IOC_TERMS, normalized)) return 'ioc';
  if (
    matchesTerm(REFERENCE_TERMS, normalized) ||
    REFERENCE_PREFIXES.some((prefix) => matchesPrefix(normalized, prefix))
  ) {
    return 'references';
  }
  return 'prose';
};
