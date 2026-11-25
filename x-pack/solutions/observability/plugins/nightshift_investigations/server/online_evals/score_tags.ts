/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STRATEGY_STATUSES } from './judges/recovery_due_diligence/causal_checklist/prompt';
import { EVIDENCE_FAMILY_IDS } from './judges/recovery_due_diligence/families';
import { CAUSAL_STRATEGY_IDS } from './judges/recovery_due_diligence/strategies';

const EVIDENCE_LEVELS = ['evidenced', 'partial', 'none'] as const;

/**
 * Every tag a judge may send, spelled out. A tag is sent only when it is in this set, so no judge
 * can put the agent's or a customer's text in one, even by accident; a judge that needs a new tag
 * adds it here, in review.
 */
export const ALLOWED_SCORE_TAGS: ReadonlySet<string> = new Set([
  // The recovery due-diligence judges.
  ...CAUSAL_STRATEGY_IDS.flatMap((id) =>
    STRATEGY_STATUSES.map((status) => `strategy:${id}:${status}`)
  ),
  ...EVIDENCE_LEVELS.map((level) => `mechanism:${level}`),
  ...EVIDENCE_LEVELS.map((level) => `closure:${level}`),
  'unsupported_claim:true',
  'unsupported_claim:false',
  ...EVIDENCE_FAMILY_IDS.map((id) => `family:${id}`),
]);

export const MAX_TAGS_PER_SCORE = 24;

/** The tags of a score's `metadata.tags` that are in the allowed set; anything else is dropped. */
export const readTags = (metadata: Record<string, unknown> | undefined): string[] => {
  const tags = metadata?.tags;
  return Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === 'string' && ALLOWED_SCORE_TAGS.has(tag))
    : [];
};
