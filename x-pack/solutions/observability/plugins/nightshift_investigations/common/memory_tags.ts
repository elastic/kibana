/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Tags with these are identifiers, whose punctuation is part of the name. */
const IDENTIFIER_CHARACTERS = /[.*@|/:]/;

/** Folding happens after NFKC so a full-width or compatibility space folds too. */
const SEPARATOR_RUN = /[\s_-]+/g;

/** Longest canonical tag. Past this a "keyword" is a sentence. */
export const MAX_MEMORY_TAG_LENGTH = 64;

/** Most tags one memory may carry; a merge unions every source page's tags. */
export const MAX_MEMORY_TAGS_PER_PAGE = 20;

/**
 * The one form a tag is compared in: lowercase, hyphen-separated, whitespace and
 * underscores folded. Identifier tags are only trimmed and lowercased.
 */
export const canonicalizeTag = (tag: string): string | null => {
  const normalized = tag.normalize('NFKC').trim().toLowerCase();
  if (normalized.length === 0) return null;

  const isIdentifier = IDENTIFIER_CHARACTERS.test(normalized);
  const folded = isIdentifier
    ? normalized
    : normalized.replace(SEPARATOR_RUN, '-').replace(/^-+|-+$/g, '');

  return folded.length > 0 ? folded.slice(0, MAX_MEMORY_TAG_LENGTH) : null;
};

/** Distinct canonical keywords a list of tag spellings names. */
export const countDistinctTags = (tags: readonly string[]): number => {
  const canonical = new Set<string>();
  for (const tag of tags) {
    const key = canonicalizeTag(tag);
    if (key !== null) canonical.add(key);
  }
  return canonical.size;
};

/** Canonicalizes tags, dropping empties and duplicates in first-seen order. */
export const canonicalizeTags = (tags: readonly unknown[] | undefined): string[] => {
  const canonical: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags ?? []) {
    const key = canonicalizeTag(typeof tag === 'string' ? tag : String(tag ?? ''));
    if (key === null || seen.has(key)) continue;
    seen.add(key);
    canonical.push(key);
  }
  return canonical;
};
