/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryEdgeType } from '../../../../../common/entity_analytics/executive_brief/types';

/**
 * Relational predicates: the verb phrases that make a sentence a *claim about a relation between
 * two entities*. Co-mention ("A, B and C are in scope") and enumeration are not relations; only a
 * sentence whose predicate links two entity mentions is checked against the computed edges.
 */

export type StrongKind = 'lateral' | 'compromise' | 'exfiltration';

export type PredicateRule =
  /** Backed by an edge of exactly this type between the pair. */
  | { kind: 'edge'; edgeType: StoryEdgeType }
  /** Logged on to / accessed: backed by any access edge, matching a rarely/regularly qualifier. */
  | { kind: 'access' }
  /** Related / linked / connected: backed by any edge between the pair. */
  | { kind: 'generic' }
  /** Lateral movement, compromise, exfiltration: backed only by specific evidence. */
  | { kind: 'strong'; strong: StrongKind };

export interface PredicateDefinition {
  id: string;
  pattern: RegExp;
  rule: PredicateRule;
  /** "A and B <predicate>" relates the members of the subject group with each other. */
  symmetric: boolean;
}

const definition = (
  id: string,
  source: string,
  rule: PredicateRule,
  symmetric = false
): PredicateDefinition => ({ id, pattern: new RegExp(source, 'gi'), rule, symmetric });

const LINK_WORD = '(?:linked|connected|tied|grouped|correlated|related)';
const ATTACK_DISCOVERY_NOUN =
  '(?:an?|the)\\s+(?:same\\s+(?:discovered\\s+)?attack(?:\\s+discovery)?|(?:discovered\\s+)?attack\\s+discovery)';

export const PREDICATES: readonly PredicateDefinition[] = [
  // "linked via an Attack Discovery", "part of the same discovered attack" map to same_ad.
  definition(
    'same_ad_linked',
    `${LINK_WORD}\\s+(?:via|through|by|in)\\s+(?:an?|the)\\s+(?:same\\s+)?(?:discovered\\s+)?attack(?:\\s+discovery)?`,
    { kind: 'edge', edgeType: 'same_ad' },
    true
  ),
  definition(
    'same_ad_member',
    `(?:part\\s+of|in|within|under|share[sd]?|sharing|from)\\s+${ATTACK_DISCOVERY_NOUN}`,
    { kind: 'edge', edgeType: 'same_ad' },
    true
  ),
  definition(
    'lead_related',
    `(?:${LINK_WORD}\\s+(?:in|via|through|by)|part\\s+of)\\s+(?:an?|the)(?:\\s+same)?(?:\\s+active)?\\s+(?:hunting\\s+)?lead`,
    { kind: 'edge', edgeType: 'lead_related' },
    true
  ),
  definition(
    'co_alert',
    'appear(?:ed|s|ing)?\\s+together(?:\\s+in\\s+(?:the\\s+same\\s+)?alerts?)?|co-?occur(?:red|s|ring)?',
    { kind: 'edge', edgeType: 'co_alert' },
    true
  ),
  definition('owns', '\\bowns\\b|\\bowned\\s+by\\b', { kind: 'edge', edgeType: 'owns' }),
  definition(
    'administers',
    '\\badminister(?:s|ed)?(?:\\s+by)?\\b|\\badmin(?:istrator)?\\s+(?:of|for|on)\\b',
    { kind: 'edge', edgeType: 'administers' }
  ),
  definition(
    'supervises',
    '\\bmanages\\b|\\bmanaged\\s+by\\b|\\bsupervis(?:es|ed)\\b|\\breports\\s+to\\b',
    { kind: 'edge', edgeType: 'supervises' }
  ),
  definition(
    'access',
    '\\blog(?:s|ged|ging)?\\s+(?:on|in)(?:\\s+to|\\s+into)?\\b|\\blogons?\\s+(?:to|on|into)\\b|\\bsign(?:s|ed|ing)?\\s+in(?:\\s+to|\\s+into)\\b|\\bauthenticat(?:es|ed|ing)\\s+to\\b|\\baccess(?:es|ed)\\b',
    { kind: 'access' }
  ),
  // Strong claims: stronger than any typed edge, so they need specific supporting evidence.
  definition(
    'lateral',
    '\\bmov(?:ed|es|e|ing)\\s+laterally(?:\\s+(?:from|between))?\\b|\\blateral(?:ly)?[ -]movement\\s+(?:from|between|to|into|towards?|onto)\\b|\\bpivot(?:ed|ing|s)?\\s+(?:from|to|through|via|into|onto|between)\\b|\\bspread(?:s|ing)?\\s+(?:from|to|across|through)\\b',
    { kind: 'strong', strong: 'lateral' }
  ),
  definition(
    'compromise',
    '\\b(?:compromis(?:ed|es|ing)|breach(?:ed|es|ing)|infect(?:ed|s|ing)|attack(?:ed|ing)|exploit(?:ed|s|ing)|took\\s+over|taken\\s+over|hijack(?:ed|s|ing))\\b',
    { kind: 'strong', strong: 'compromise' }
  ),
  definition(
    'exfiltration',
    '\\bexfiltrat(?:ed|es|ing|e)\\s+(?:(?:data|files|credentials|information|secrets)\\s+)?(?:from|to|via|through)\\b|\\bdata\\s+exfiltration\\s+(?:from|to)\\b',
    { kind: 'strong', strong: 'exfiltration' }
  ),
  definition(
    'generic',
    '\\b(?:linked|connected|tied|associated|correlated|related)\\b(?:\\s+(?:to|with))?',
    { kind: 'generic' },
    true
  ),
];

export interface PredicateMatch {
  definition: PredicateDefinition;
  text: string;
  start: number;
  end: number;
}

/**
 * Finds the predicates in one sentence. Overlaps are resolved in favour of the longest match, so
 * "linked via an Attack Discovery" wins over the generic "linked".
 */
export const findPredicates = (sentence: string): PredicateMatch[] => {
  const candidates: PredicateMatch[] = [];
  PREDICATES.forEach((predicate) => {
    for (const match of sentence.matchAll(predicate.pattern)) {
      const start = match.index ?? 0;
      candidates.push({
        definition: predicate,
        text: match[0],
        start,
        end: start + match[0].length,
      });
    }
  });
  const accepted: PredicateMatch[] = [];
  [...candidates]
    .sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start)
    .forEach((candidate) => {
      if (!accepted.some((m) => candidate.start < m.end && m.start < candidate.end)) {
        accepted.push(candidate);
      }
    });
  return accepted.sort((a, b) => a.start - b.start);
};
