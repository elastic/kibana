/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefDraft, BriefPriority, EntityFacts } from './brief_types';
import { BRIEF_WORD_LIMITS, MAX_PRIORITIES } from './brief_types';
import { BRIEF_PERIOD_LABELS, BRIEF_TILE_DEFINITIONS } from './describe_scope';

export const MENTION_PATTERN = /\{\{\s*entity\.id\s+([^}]+?)\s*\}\}/g;
/** Numbers as written in prose, with thousands separators; signs are ignored. */
const NUMBER_PATTERN = /\d[\d,]*(?:\.\d+)?/g;
const SENTENCE_END = /(?<=[.!?])\s+/;
/** A mention counts as one word, so a cap never cuts one in half. */
const WORD_PATTERN = /\{\{[^}]*\}\}|\S+/g;

export interface VerifiedBrief {
  /** Absent when nothing is left, or when no priority survived and it names no candidate. */
  attention?: string;
  /** Absent when nothing is left or no priority survived. */
  recommendation?: string;
  priorities: BriefPriority[];
  droppedPriorityCount: number;
}

/** Replaces each `{{ entity.id <euid> }}` mention with the replacer's result. */
const replaceMentions = (text: string, replacer: (entityId: string) => string): string =>
  text.replace(MENTION_PATTERN, (_mention, entityId: string) => replacer(entityId));

const cutWords = (text: string, max: number): string => {
  const words = [...text.matchAll(WORD_PATTERN)];
  const last = words[max - 1];
  if (words.length <= max || last?.index === undefined) {
    return text.trim();
  }
  const kept = text.slice(0, last.index + last[0].length);
  return `${kept.trim().replace(/[\s,;:.-]+$/, '')}…`;
};

/** Keeps the whole sentences that fit, so a long answer loses its last sentence, not half of it. */
const capWords = (text: string, max: number): string => {
  const kept: string[] = [];
  let count = 0;
  for (const sentence of text.trim().split(SENTENCE_END)) {
    count += sentence.match(WORD_PATTERN)?.length ?? 0;
    if (count > max) {
      break;
    }
    kept.push(sentence);
  }
  return kept.length > 0 ? kept.join(' ') : cutWords(text, max);
};

/** Cuts tool-call markup the model sometimes leaks at the end of a string argument. */
const stripToolMarkup = (text: string): string =>
  text.replace(/<\/?(?:parameter|invoke|attention|recommendation)\b[\s\S]*$/, '');

const numbersIn = (text: string): string[] =>
  (text.match(NUMBER_PATTERN) ?? []).map((number) => String(Number(number.replace(/,/g, ''))));

/**
 * True when every number in the text is known: in the given entities' data or what their flags mean, or
 * the period, a count or a change in the view. Digits inside mentions, names and EUIDs are ignored.
 */
const createNumberCheck = (
  { tiles, period }: EntityAnalyticsScope,
  facts: EntityFacts[]
): ((text: string, entities: EntityFacts[]) => boolean) => {
  const periodLabel = BRIEF_PERIOD_LABELS[period];
  const viewNumbers = [
    ...numbersIn(periodLabel),
    ...Object.values(tiles)
      .flatMap(({ value, delta }) => (delta === undefined ? [value] : [value, Math.abs(delta)]))
      .map(String),
  ];
  const names = facts.flatMap(({ entityId, name }) => [entityId, name]).filter(Boolean);
  return (text, entities) => {
    const known = new Set([
      ...viewNumbers,
      ...entities.flatMap(({ entityId, name, flaggedFor, ...data }) => [
        ...numbersIn(JSON.stringify(data)),
        ...flaggedFor.flatMap((tileId) => numbersIn(BRIEF_TILE_DEFINITIONS[tileId](periodLabel))),
      ]),
    ]);
    const prose = names.reduce(
      (remaining, name) => remaining.split(name).join(' '),
      replaceMentions(text, () => ' ')
    );
    return numbersIn(prose).every((number) => known.has(number));
  };
};

/**
 * Checks the model's draft against the entities and the view, and trims it to the limits. A priority must
 * be about a flagged entity and quote only its own numbers.
 */
export const verifyDraft = (
  draft: BriefDraft,
  facts: EntityFacts[],
  scope: EntityAnalyticsScope
): VerifiedBrief => {
  const factsById = new Map(facts.map((entity) => [entity.entityId, entity]));
  const hasKnownNumbers = createNumberCheck(scope, facts);
  const clean = (text: string, max: number): string =>
    capWords(
      replaceMentions(text, (entityId) =>
        factsById.has(entityId) ? `{{ entity.id ${entityId} }}` : ''
      ),
      max
    );

  const seenEntityIds = new Set<string>();
  const priorities: BriefPriority[] = [];
  for (const { entityId, observed, whyItMatters, nextStep } of draft.priorities) {
    const entity = factsById.get(entityId);
    const isKept =
      entity !== undefined &&
      [observed, whyItMatters, nextStep].every((text) => hasKnownNumbers(text, [entity])) &&
      !seenEntityIds.has(entityId) &&
      priorities.length < MAX_PRIORITIES;
    if (isKept) {
      seenEntityIds.add(entityId);
      priorities.push({
        entityId,
        observed: clean(observed, BRIEF_WORD_LIMITS.priorityText),
        whyItMatters: clean(whyItMatters, BRIEF_WORD_LIMITS.priorityText),
        nextStep: clean(nextStep, BRIEF_WORD_LIMITS.priorityText),
      });
    }
  }

  // A sentence with a number that is in neither the entities nor the view is dropped, not repaired.
  const cleanProse = (text: string, max: number): string =>
    clean(
      stripToolMarkup(text)
        .split(SENTENCE_END)
        .filter((sentence) => hasKnownNumbers(sentence, facts))
        .join(' '),
      max
    );
  const attention = cleanProse(draft.attention, BRIEF_WORD_LIMITS.attention);
  const recommendation = cleanProse(draft.recommendation, BRIEF_WORD_LIMITS.recommendation);
  const namesCandidate = replaceMentions(attention, () => '') !== attention;
  const keepAttention = attention !== '' && (priorities.length > 0 || namesCandidate);
  return {
    attention: keepAttention ? attention : undefined,
    recommendation: recommendation !== '' && priorities.length > 0 ? recommendation : undefined,
    priorities,
    droppedPriorityCount: draft.priorities.length - priorities.length,
  };
};
