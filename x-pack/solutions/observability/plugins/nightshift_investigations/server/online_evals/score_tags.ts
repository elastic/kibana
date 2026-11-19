/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Tags are for monitoring, so they come from fixed vocabularies and never carry the agent's text. */
export const TAG_PATTERN = /^[a-z0-9_]+(:[a-z0-9_.-]+)*$/;

/** The tags of a score's `metadata.tags`, kept only when every one is a vocabulary-shaped keyword. */
export const readTags = (metadata: Record<string, unknown> | undefined): string[] => {
  const tags = metadata?.tags;
  return Array.isArray(tags)
    ? tags.filter(
        (tag): tag is string => typeof tag === 'string' && tag.length <= 80 && TAG_PATTERN.test(tag)
      )
    : [];
};

export const MAX_TAGS_PER_SCORE = 24;
