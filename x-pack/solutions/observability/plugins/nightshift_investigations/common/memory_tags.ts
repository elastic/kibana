/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const IDENTIFIER_CHARACTERS = /[.*@|/:]/;

const SEPARATOR_RUN = /[\s_-]+/g;

export const MAX_MEMORY_TAG_LENGTH = 64;

/** A merge unions every source page's tags, so this bounds a page's tags. */
export const MAX_MEMORY_TAGS_PER_PAGE = 20;

/** The one form a tag is compared in: lowercase, hyphen-separated, separators folded. */
export const canonicalizeTag = (tag: string): string | null => {
  const normalized = tag.normalize('NFKC').trim().toLowerCase();
  if (normalized.length === 0) return null;

  const isIdentifier = IDENTIFIER_CHARACTERS.test(normalized);
  const folded = isIdentifier
    ? normalized
    : normalized.replace(SEPARATOR_RUN, '-').replace(/^-+|-+$/g, '');

  return folded.length > 0 ? folded.slice(0, MAX_MEMORY_TAG_LENGTH) : null;
};

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
