/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cuts `text` to at most `max` characters at a word boundary, with no ellipsis: the result is
 * a complete prefix, never a mid-word or mid-string cut. A single word longer than `max` is
 * cut hard, since there is no boundary to prefer.
 */
export const truncateAtWord = (text: string, max: number): string => {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const boundary = cut.search(/\s\S*$/);
  return (boundary > 0 ? cut.slice(0, boundary) : cut).trimEnd();
};

/**
 * Removes the hunt's own decoration from an SSE title: a leading `Hunt:` and a trailing
 * `[...]` group (`Hunt: Cloud Accounts (T1078.004) [ti-repor]` becomes
 * `Cloud Accounts (T1078.004)`).
 */
export const stripFindingTitle = (title: string): string =>
  title
    .replace(/^\s*Hunt:\s*/i, '')
    .replace(/\s*\[[^\]]*\]\s*$/, '')
    .trim();

/**
 * The first sentence of `text`, without its closing punctuation. A sentence ends at `.`, `!`
 * or `?` followed by whitespace or the end, so the dot in `T1078.004` does not end it.
 */
export const firstSentence = (text: string): string => {
  const trimmed = text.trim();
  const match = /^(.+?)[.!?](?:\s|$)/s.exec(trimmed);
  return (match ? match[1] : trimmed).trim();
};

/** `T1078.004` and, when a name is known, `Cloud Accounts (T1078.004)`. */
export const techniqueLabel = (techniqueId: string, techniqueName?: string): string =>
  techniqueName ? `${techniqueName} (${techniqueId})` : techniqueId;
