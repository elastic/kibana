/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characters that make a tag an identifier rather than a phrase.
 *
 * ECS field names (`gen_ai.conversation.id`), index patterns (`traces-*`), query
 * languages (`ES|QL`) and model ids (`anthropic/claude-sonnet-4.6`) all spell
 * themselves with these, and folding `_` or spaces inside them would invent names
 * that match nothing.
 */
const IDENTIFIER_CHARACTERS = /[.*@|/:]/;

/** Folding happens after NFKC so a full-width or compatibility space folds too. */
const SEPARATOR_RUN = /[\s_-]+/g;

/** Longest canonical tag. Past this a "keyword" is a sentence. */
export const MAX_MEMORY_TAG_LENGTH = 64;

/**
 * Most tags one memory may carry. Merges union the tags of every source page, so
 * without a cap a heavily merged memory can accumulate every tag ever seen.
 */
export const MAX_MEMORY_TAGS_PER_PAGE = 20;

/**
 * The one form a memory tag is compared in.
 *
 * This is the widely used tag convention — GitHub topics and Stack Overflow tags
 * are lowercase and hyphen-separated — so a tag written by hand, by the
 * optimizer, or by an index pattern reads the same as the others.
 *
 * Tags that contain `.`, `*`, `@`, `|`, `/`, or `:` are identifiers rather than
 * phrases and are only trimmed and lowercased: their punctuation is part of the
 * name, so folding separators inside them would produce a tag nothing matches.
 *
 * Returns null for anything that folds to nothing, so callers can drop it rather
 * than store an empty tag.
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

/**
 * Canonicalizes a list of tags, dropping empties and duplicates in first-seen
 * order. Does not cap the length: the cap belongs to the write layer, and a read
 * must still report every tag a stored document carries.
 */
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