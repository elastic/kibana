/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefDraft, BriefFact, BriefPriority } from './brief_types';
import { MAX_PRIORITIES } from './brief_types';
import { BRIEF_WORD_LIMITS } from './brief_prompt';

const MENTION_PATTERN = /\{\{\s*entity\.id\s+([^}]+?)\s*\}\}/g;
/** A mention counts as one word, so a cap never cuts one in half. */
const WORD_PATTERN = /\{\{[^}]*\}\}|\S+/g;

export interface VerifiedBrief {
  /** Absent when nothing is left, or when no priority survived and it names no candidate. */
  attention?: string;
  priorities: BriefPriority[];
  droppedPriorityCount: number;
}

/** Replaces each `{{ entity.id <euid> }}` mention with the replacer's result. */
export const replaceMentions = (text: string, replacer: (entityId: string) => string): string =>
  text.replace(MENTION_PATTERN, (_mention, entityId: string) => replacer(entityId));

const capWords = (text: string, max: number): string => {
  const words = [...text.matchAll(WORD_PATTERN)];
  const last = words[max - 1];
  if (words.length <= max || last?.index === undefined) {
    return text.trim();
  }
  const kept = text.slice(0, last.index + last[0].length);
  return `${kept.trim().replace(/[\s,;:.-]+$/, '')}…`;
};

/** Cuts tool-call markup the model sometimes leaks at the end of a string argument. */
const stripToolMarkup = (text: string): string =>
  text.replace(/<\/?(?:parameter|invoke|attention)\b[\s\S]*$/, '');

/** Checks the model's draft against the facts it was written from, and trims it to the limits. */
export const verifyBrief = (draft: BriefDraft, facts: BriefFact[]): VerifiedBrief => {
  const factsById = new Map(facts.map((fact) => [fact.id, fact]));
  const candidateIds = new Set(facts.map(({ entityId }) => entityId));
  const clean = (text: string, max: number): string =>
    capWords(
      replaceMentions(text, (entityId) =>
        candidateIds.has(entityId) ? `{{ entity.id ${entityId} }}` : ''
      ),
      max
    );

  const seenEntityIds = new Set<string>();
  const priorities: BriefPriority[] = [];
  for (const priority of draft.priorities) {
    const { entityId } = priority;
    const factIds = [...new Set(priority.factIds)].filter(
      (factId) => factsById.get(factId)?.entityId === entityId
    );
    const isKept =
      factIds.length > 0 && !seenEntityIds.has(entityId) && priorities.length < MAX_PRIORITIES;
    if (isKept) {
      seenEntityIds.add(entityId);
      priorities.push({
        entityId,
        observed: clean(priority.observed, BRIEF_WORD_LIMITS.priorityText),
        whyItMatters: clean(priority.whyItMatters, BRIEF_WORD_LIMITS.priorityText),
        nextStep: clean(priority.nextStep, BRIEF_WORD_LIMITS.priorityText),
        factIds,
      });
    }
  }

  const attention = clean(stripToolMarkup(draft.attention), BRIEF_WORD_LIMITS.attention);
  const namesCandidate = replaceMentions(attention, () => '') !== attention;
  const keepAttention = attention !== '' && (priorities.length > 0 || namesCandidate);
  return {
    attention: keepAttention ? attention : undefined,
    priorities,
    droppedPriorityCount: draft.priorities.length - priorities.length,
  };
};
