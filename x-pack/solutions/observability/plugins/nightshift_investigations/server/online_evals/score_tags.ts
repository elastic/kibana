/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The tag prefixes a judge may send. Each names a fixed vocabulary the judge builds from, so a tag
 * never carries the agent's or a customer's text. A judge that needs a new prefix adds it here, in
 * review: a tag with any other prefix is dropped.
 */
export const ALLOWED_TAG_PREFIXES: readonly string[] = [
  // The recovery due-diligence judges: `strategy:<id>:<status>`, `mechanism:<level>`,
  // `closure:<level>`, `unsupported_claim:<true|false>` and `family:<id>`.
  'strategy',
  'mechanism',
  'closure',
  'unsupported_claim',
  'family',
];

/** The shape of a tag: lowercase words joined by colons. */
export const TAG_PATTERN = /^[a-z0-9_]+(:[a-z0-9_.-]+)*$/;

const isAllowedTag = (tag: string): boolean => {
  const [prefix, ...rest] = tag.split(':');
  return (
    tag.length <= 80 &&
    TAG_PATTERN.test(tag) &&
    rest.length > 0 &&
    ALLOWED_TAG_PREFIXES.includes(prefix)
  );
};

/** The tags of a score's `metadata.tags`, kept only when each has an allowed prefix and the right shape. */
export const readTags = (metadata: Record<string, unknown> | undefined): string[] => {
  const tags = metadata?.tags;
  return Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === 'string' && isAllowedTag(tag))
    : [];
};

export const MAX_TAGS_PER_SCORE = 24;
