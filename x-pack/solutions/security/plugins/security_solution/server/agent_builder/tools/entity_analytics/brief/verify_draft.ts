/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeRegExp, orderBy, uniqBy } from 'lodash';
import type { BriefDraft, BriefPriority } from './prompts';
import { MAX_PRIORITIES } from './prompts';
import type { EntityFacts } from './types';

export const MENTION_PATTERN = /\{\{\s*entity\.id\s+([^}]+?)\s*\}\}/g;

export interface VerifiedBrief {
  /** Absent without a priority: the brief then says there is nothing to prioritize. */
  summary?: string;
  /** Absent without a priority, as the summary. */
  recommendation?: string;
  priorities: BriefPriority[];
  droppedPriorityCount: number;
}

/**
 * Keeps the draft to the flagged entities: each priority is about a different one, and a mention of any
 * other entity is removed.
 */
export const verifyDraft = (draft: BriefDraft, facts: EntityFacts[]): VerifiedBrief => {
  const flaggedIds = new Set(facts.map(({ entityId }) => entityId));
  const mention = (entityId: string) => `{{ entity.id ${entityId} }}`;
  // Longest first, so an EUID is never matched by a shorter one it starts with.
  const writtenId = new RegExp(
    orderBy([...flaggedIds], 'length', 'desc')
      .map(escapeRegExp)
      .join('|'),
    'g'
  );
  // Mentions sit at odd indexes. In the prose between them, a flagged entity's EUID written out
  // becomes its mention, so it reads as the entity's name.
  const keepFlaggedMentions = (text: string): string =>
    text
      .split(MENTION_PATTERN)
      .map((part, index) => {
        if (index % 2 === 1) {
          return flaggedIds.has(part) ? mention(part) : '';
        }
        return flaggedIds.size > 0 ? part.replace(writtenId, mention) : part;
      })
      .join('')
      .trim();

  const priorities = uniqBy(
    draft.priorities.filter(({ entityId }) => flaggedIds.has(entityId)),
    'entityId'
  )
    .slice(0, MAX_PRIORITIES)
    .map(({ entityId, observed, whyItMatters, nextStep }) => ({
      entityId,
      observed: keepFlaggedMentions(observed),
      whyItMatters: keepFlaggedMentions(whyItMatters),
      nextStep: keepFlaggedMentions(nextStep),
    }));
  const keepProse = (text: string): string | undefined =>
    (priorities.length > 0 && keepFlaggedMentions(text)) || undefined;

  return {
    summary: keepProse(draft.summary),
    recommendation: keepProse(draft.recommendation),
    priorities,
    droppedPriorityCount: draft.priorities.length - priorities.length,
  };
};
