/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STORY_EDGE_CONFIG } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefValidation,
  EvidenceCatalog,
  EvidenceId,
  StoryEdge,
  StoryEdgeType,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { escapeRegExp, findEntityMentions, splitSentences } from './entity_mentions';
import type { EntityIndex, EntityMention } from './entity_mentions';

export type UnbackedRelation = BriefValidation['unbackedRelations'][number];

const LATERAL_TACTIC_ID = 'TA0008';
const ACCESS_EDGE_TYPES: readonly StoryEdgeType[] = [
  'accesses_frequently',
  'accesses_infrequently',
  'communicates_with',
];

/** Distinct verbs the narrative may use, lower-cased, matched as whole phrases. */
const EDGE_VERB_PATTERNS: Array<{ verb: string; pattern: RegExp }> = [
  ...new Set(Object.values(STORY_EDGE_CONFIG).map(({ verb }) => verb.toLowerCase())),
].map((verb) => ({
  verb,
  pattern: new RegExp(`(?<![\\w])${escapeRegExp(verb)}(?![\\w])`, 'i'),
}));

interface StrongClaim {
  pattern: RegExp;
  isBacked: (backing: Backing) => boolean;
}

interface Backing {
  edges: StoryEdge[];
  /** True when a TA0008 rule is cited by the claim or by one of the connecting edges. */
  hasLateralRule: boolean;
}

/**
 * Relation claims that are stronger than the typed edges. Each is only acceptable when the
 * snapshot backs it: lateral movement needs a cited TA0008 rule; "attacked/compromised" needs an
 * attack discovery edge; "logged on" needs an access edge.
 */
const STRONG_CLAIMS: StrongClaim[] = [
  {
    pattern:
      /\b(?:moved|move|moves|moving) laterally\b|\blateral(?:ly)?[ -]movement\b|\bpivot(?:ed|ing|s)?\b|\bspread(?:s|ing)? (?:to|from|across|through)\b/i,
    isBacked: ({ hasLateralRule }) => hasLateralRule,
  },
  {
    pattern:
      /\b(?:compromis(?:ed|es|ing)|breach(?:ed|es|ing)|infect(?:ed|s|ing)|attack(?:ed|s|ing)|exploit(?:ed|s|ing)|took over|taken over|hijack(?:ed|s|ing))\b/i,
    isBacked: ({ edges }) => edges.some(({ type }) => type === 'same_ad'),
  },
  {
    pattern:
      /\blog(?:s|ged|ging)? (?:on|in) to\b|\blogons? to\b|\bsigned in to\b|\bauthenticated to\b/i,
    isBacked: ({ edges }) => edges.some(({ type }) => ACCESS_EDGE_TYPES.includes(type)),
  },
];

export const edgeLinksGroups = (edge: StoryEdge, a: Set<string>, b: Set<string>): boolean =>
  (a.has(edge.from) && b.has(edge.to)) || (b.has(edge.from) && a.has(edge.to));

const neighbours = (group: Set<string>, edges: StoryEdge[]): Set<string> => {
  const result = new Set<string>();
  edges.forEach(({ from, to }) => {
    if (group.has(from) && !group.has(to)) {
      result.add(to);
    }
    if (group.has(to) && !group.has(from)) {
      result.add(from);
    }
  });
  return result;
};

/**
 * Edges that back a pair of mentioned entities. A direct edge is required; the one tolerated
 * exception is two entities that both hang off a common storyline entity ("the same identity
 * logged on to X and later to Y"), in which case the two spokes back the sentence.
 */
const edgesBackingPair = (a: Set<string>, b: Set<string>, edges: StoryEdge[]): StoryEdge[] => {
  const direct = edges.filter((edge) => edgeLinksGroups(edge, a, b));
  if (direct.length > 0) {
    return direct;
  }
  const neighboursOfB = neighbours(b, edges);
  const common = new Set([...neighbours(a, edges)].filter((euid) => neighboursOfB.has(euid)));
  if (common.size === 0) {
    return [];
  }
  return edges.filter((edge) =>
    [...common].some(
      (c) => edgeLinksGroups(edge, a, new Set([c])) || edgeLinksGroups(edge, b, new Set([c]))
    )
  );
};

const hasLateralRuleEvidence = (ids: readonly EvidenceId[], catalog: EvidenceCatalog): boolean =>
  ids.some((id) => {
    const entry = catalog[id];
    return entry?.kind === 'rule' && entry.tacticIds.includes(LATERAL_TACTIC_ID);
  });

const mentionKey = (mention: EntityMention): string => [...mention.euids].sort().join('|');

/**
 * Finds sentences that link two entities without a computed edge, or with a stronger verb than
 * the edge allows. Direction is not parsed: an edge in either direction backs the pair.
 */
export const findUnbackedRelations = ({
  text,
  edges,
  index,
  catalog,
  citedEvidence,
}: {
  text: string;
  edges: StoryEdge[];
  index: EntityIndex;
  catalog: EvidenceCatalog;
  /** Valid evidence ids cited by the claim the text belongs to. */
  citedEvidence: readonly EvidenceId[];
}): UnbackedRelation[] => {
  const found: UnbackedRelation[] = [];
  const claimHasLateralRule = hasLateralRuleEvidence(citedEvidence, catalog);

  splitSentences(text).forEach((sentence) => {
    const mentions = findEntityMentions(sentence, index);
    const distinct: EntityMention[] = [];
    mentions.forEach((mention) => {
      if (!distinct.some((d) => mentionKey(d) === mentionKey(mention))) {
        distinct.push(mention);
      }
    });
    if (distinct.length < 2) {
      return;
    }

    const usedVerbs = EDGE_VERB_PATTERNS.filter(({ pattern }) => pattern.test(sentence)).map(
      ({ verb }) => verb
    );
    const strongClaims = STRONG_CLAIMS.filter(({ pattern }) => pattern.test(sentence));

    for (let i = 0; i < distinct.length; i++) {
      for (let j = i + 1; j < distinct.length; j++) {
        const a = new Set(distinct[i].euids);
        const b = new Set(distinct[j].euids);
        const sameEntity = distinct[j].euids.some((euid) => a.has(euid));
        const backing = edgesBackingPair(a, b, edges);
        const allowedVerbs = new Set(
          backing.map(({ type }) => STORY_EDGE_CONFIG[type].verb.toLowerCase())
        );
        const lateralOnEdges = backing.some((edge) =>
          hasLateralRuleEvidence(edge.evidenceIds, catalog)
        );
        const context: Backing = {
          edges: backing,
          hasLateralRule: claimHasLateralRule || lateralOnEdges,
        };

        const isBacked =
          sameEntity ||
          (backing.length > 0 &&
            usedVerbs.every((verb) => allowedVerbs.has(verb)) &&
            strongClaims.every(({ isBacked: check }) => check(context)));

        if (!isBacked) {
          found.push({
            statement: sentence,
            from: index.displayName(distinct[i].euids[0]),
            to: index.displayName(distinct[j].euids[0]),
          });
        }
      }
    }
  });
  return found;
};
