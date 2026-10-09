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
import { findEntityMentions, splitSentences } from './entity_mentions';
import type { EntityIndex, EntityMention } from './entity_mentions';
import { findPredicates } from './relation_predicates';
import type { PredicateMatch, StrongKind } from './relation_predicates';

export type UnbackedRelation = BriefValidation['unbackedRelations'][number];

/**
 * A relation claim without backing. `strong` claims (lateral movement, compromise, exfiltration)
 * drop the claim they are in; `weak` ones keep the claim and are flagged.
 */
export interface RelationFinding extends UnbackedRelation {
  strength: 'weak' | 'strong';
  reason: string;
}

const TACTIC_BY_STRONG_KIND: Partial<Record<StrongKind, string>> = {
  lateral: 'TA0008',
  exfiltration: 'TA0010',
};

const ACCESS_EDGE_TYPES: readonly StoryEdgeType[] = [
  'accesses_frequently',
  'accesses_infrequently',
  'communicates_with',
];
const FREQUENT_EDGE_TYPES: readonly StoryEdgeType[] = ['accesses_frequently', 'communicates_with'];
const INFREQUENT_EDGE_TYPES: readonly StoryEdgeType[] = ['accesses_infrequently'];

const RARE_WORDS = '(?:only\\s+|very\\s+)?(?:rarely|infrequently|occasionally|seldom)';
const REGULAR_WORDS = '(?:regularly|frequently|routinely|often)';
const QUALIFIER_BEFORE = new RegExp(`\\b(${RARE_WORDS}|${REGULAR_WORDS})\\s*$`, 'i');
const QUALIFIER_PARENTHESIS = new RegExp(
  `^\\s*\\(\\s*(${RARE_WORDS}|${REGULAR_WORDS})\\s*\\)`,
  'i'
);
const QUALIFIER_AFTER = new RegExp(`^\\s*(${RARE_WORDS}|${REGULAR_WORDS})\\b`, 'i');

/** "A, B and C", "A / B": the gap between two mentions of the same coordinated list. */
const COORDINATION_GAP = /^\s*(?:,\s*(?:(?:and|or)\s+)?|(?:and|or|&|plus)\s+|\/)\s*$/i;
const COMMA_CONJUNCTION_GAP = /^\s*,\s*(?:and|or)\s+$/i;
/** ", and appeared together ...": the same subject continues with a new predicate. */
const SUBJECT_CONTINUES_GAP = /^[\s,]*(?:(?:and|but|then)\s+)*(?:also\s+)?$/i;
const TO_GAP = /^\s*(?:to|into|onto|towards?)\s+$/i;

const MAX_OBJECT_GAP_WORDS = 4;
const MAX_TIGHT_SUBJECT_GAP_WORDS = 4;

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

const hasTacticRuleEvidence = (
  ids: readonly EvidenceId[],
  catalog: EvidenceCatalog,
  tacticId: string
): boolean =>
  ids.some((id) => {
    const entry = catalog[id];
    return entry?.kind === 'rule' && entry.tacticIds.includes(tacticId);
  });

const mentionKey = (mention: EntityMention): string => [...mention.euids].sort().join('|');

interface Run {
  mentions: EntityMention[];
  start: number;
  end: number;
}

const wordCount = (text: string): number =>
  text
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

const hasClauseBreak = (text: string): boolean => /[;:]/.test(text);

/** Blanks the given spans so other predicates in a gap do not count as words. */
const blankSpans = (
  sentence: string,
  from: number,
  to: number,
  spans: ReadonlyArray<{ start: number; end: number }>
): string => {
  let text = '';
  for (let i = from; i < to; i++) {
    const inside = spans.some((span) => i >= span.start && i < span.end);
    text += inside ? ' ' : sentence[i];
  }
  return text;
};

/**
 * Groups mentions into coordinated lists ("A, B and C"). A ", and" that starts a new clause
 * ("A owns B, and C logged on to D") ends the list.
 */
const buildRuns = (
  sentence: string,
  mentions: EntityMention[],
  predicates: PredicateMatch[]
): Run[] => {
  const runs: Run[] = [];
  let current: EntityMention[] = [];

  const flush = (): void => {
    if (current.length > 0) {
      runs.push({
        mentions: current,
        start: current[0].start,
        end: current[current.length - 1].end,
      });
      current = [];
    }
  };

  mentions.forEach((mention, i) => {
    if (current.length === 0) {
      current = [mention];
      return;
    }
    const previous = current[current.length - 1];
    const gap = sentence.slice(previous.end, mention.start);
    let coordinated = COORDINATION_GAP.test(gap);
    if (coordinated && COMMA_CONJUNCTION_GAP.test(gap)) {
      const nextStart = mentions[i + 1]?.start ?? Number.POSITIVE_INFINITY;
      const predicateBefore = predicates.some(({ end }) => end <= current[0].start);
      const predicateAfter = predicates.some(
        ({ start }) => start >= mention.end && start < nextStart
      );
      if (predicateBefore && predicateAfter) {
        coordinated = false;
      }
    }
    if (coordinated) {
      current.push(mention);
    } else {
      flush();
      current = [mention];
    }
  });
  flush();
  return runs;
};

type Qualifier = 'rare' | 'regular';

const qualifierOf = (word: string): Qualifier =>
  /^(?:only\s+|very\s+)?(?:rarely|infrequently|occasionally|seldom)$/i.test(word.trim())
    ? 'rare'
    : 'regular';

/** A rarely/regularly qualifier next to a logon predicate, or after its object. */
const findQualifier = (
  sentence: string,
  predicate: PredicateMatch,
  objectRun: Run | undefined
): Qualifier | undefined => {
  const before = sentence.slice(Math.max(0, predicate.start - 24), predicate.start);
  const beforeMatch = QUALIFIER_BEFORE.exec(before);
  if (beforeMatch) {
    return qualifierOf(beforeMatch[1]);
  }
  const parenthesis = QUALIFIER_PARENTHESIS.exec(sentence.slice(predicate.end, predicate.end + 24));
  if (parenthesis) {
    return qualifierOf(parenthesis[1]);
  }
  if (objectRun) {
    const after = QUALIFIER_AFTER.exec(sentence.slice(objectRun.end, objectRun.end + 24));
    if (after) {
      return qualifierOf(after[1]);
    }
  }
  return undefined;
};

interface PairCheckContext {
  edges: StoryEdge[];
  catalog: EvidenceCatalog;
  claimTactics: ReadonlySet<string>;
}

interface PairVerdict {
  backed: boolean;
  detail: string;
}

const describeEdges = (edges: StoryEdge[]): string => {
  const verbs = [...new Set(edges.map(({ type }) => STORY_EDGE_CONFIG[type].verb))];
  return verbs.length === 0
    ? 'no computed link between them'
    : `computed links: ${verbs.join(', ')}`;
};

const checkPair = ({
  predicate,
  qualifier,
  a,
  b,
  context,
}: {
  predicate: PredicateMatch;
  qualifier: Qualifier | undefined;
  a: Set<string>;
  b: Set<string>;
  context: PairCheckContext;
}): PairVerdict => {
  const { rule } = predicate.definition;
  const backing = edgesBackingPair(a, b, context.edges);
  const detail = describeEdges(backing);

  switch (rule.kind) {
    case 'edge':
      return { backed: backing.some(({ type }) => type === rule.edgeType), detail };
    case 'access': {
      const allowed =
        qualifier === 'rare'
          ? INFREQUENT_EDGE_TYPES
          : qualifier === 'regular'
          ? FREQUENT_EDGE_TYPES
          : ACCESS_EDGE_TYPES;
      return { backed: backing.some(({ type }) => allowed.includes(type)), detail };
    }
    case 'generic':
      return { backed: backing.length > 0, detail };
    case 'strong': {
      if (backing.length === 0) {
        return { backed: false, detail };
      }
      if (rule.strong === 'compromise') {
        return { backed: backing.some(({ type }) => type === 'same_ad'), detail };
      }
      const tactic = TACTIC_BY_STRONG_KIND[rule.strong];
      const backedByRule =
        tactic !== undefined &&
        (context.claimTactics.has(tactic) ||
          backing.some((edge) => hasTacticRuleEvidence(edge.evidenceIds, context.catalog, tactic)));
      return {
        backed: backedByRule,
        detail: backedByRule ? detail : `${detail}; no ${tactic} rule evidence`,
      };
    }
    default:
      return { backed: true, detail };
  }
};

/**
 * Finds sentences that make a relational claim about two entities that the snapshot does not back.
 *
 * Only explicit predicates between two entity mentions are checked ("A logged on to B", "A and B
 * appeared together in alerts", "A linked via an Attack Discovery to B, C and D" checks A-B, A-C and
 * A-D, not B-C). Co-mention and enumeration are not relations. Each predicate is checked on its
 * own: a sentence with several predicates is not held to the verbs of the others. Direction is
 * not parsed: an edge in either direction backs the pair.
 */
export const findUnbackedRelations = ({
  text,
  edges,
  index,
  catalog,
  citedEvidence,
  isComparisonPair,
}: {
  text: string;
  edges: StoryEdge[];
  index: EntityIndex;
  catalog: EvidenceCatalog;
  /** Valid evidence ids cited by the claim the text belongs to. */
  citedEvidence: readonly EvidenceId[];
  /**
   * True for an entity pair that belongs to different storylines cited by a cross-storyline
   * comparison. Such pairs are not edge-checked, unless the claim about them is strong.
   */
  isComparisonPair?: (a: ReadonlySet<string>, b: ReadonlySet<string>) => boolean;
}): RelationFinding[] => {
  const findings = new Map<string, RelationFinding>();
  const claimTactics = new Set<string>();
  Object.values(TACTIC_BY_STRONG_KIND).forEach((tactic) => {
    if (tactic !== undefined && hasTacticRuleEvidence(citedEvidence, catalog, tactic)) {
      claimTactics.add(tactic);
    }
  });
  const context: PairCheckContext = { edges, catalog, claimTactics };

  splitSentences(text).forEach((sentence) => {
    const mentions = findEntityMentions(sentence, index);
    if (new Set(mentions.map(mentionKey)).size < 2) {
      return;
    }
    const predicates = findPredicates(sentence).filter(
      (predicate) =>
        !mentions.some(({ start, end }) => predicate.start < end && start < predicate.end)
    );
    if (predicates.length === 0) {
      return;
    }
    const runs = buildRuns(sentence, mentions, predicates);
    const predicateSpans = predicates.map(({ start, end }) => ({ start, end }));

    let previous:
      | { subject: Run | undefined; objectRun: Run | undefined; start: number }
      | undefined;

    predicates.forEach((predicate) => {
      const { definition } = predicate;
      const fromTo = /\bfrom$/i.test(predicate.text);
      const between = /\bbetween$/i.test(predicate.text);

      let subject: Run | undefined;
      let objectRun: Run | undefined;
      let subjectIsTight = false;

      if (fromTo || between) {
        // "lateral movement from A to B", "movement between A and B": operands follow.
        const first = runs.find((run) => run.start >= predicate.end);
        const gapToFirst = first ? sentence.slice(predicate.end, first.start) : '';
        if (first && gapToFirst.trim().length === 0) {
          subject = first;
          subjectIsTight = true;
          if (fromTo) {
            const second = runs.find((run) => run.start >= first.end);
            if (second && TO_GAP.test(sentence.slice(first.end, second.start))) {
              objectRun = second;
            }
          }
        }
      } else {
        const left = [...runs].reverse().find((run) => run.end <= predicate.start);
        const gapFromLeft = left ? sentence.slice(left.end, predicate.start) : '';
        if (left && !hasClauseBreak(gapFromLeft)) {
          const continues =
            previous !== undefined &&
            ((previous.objectRun === left && SUBJECT_CONTINUES_GAP.test(gapFromLeft)) ||
              left.end <= previous.start);
          if (previous && continues) {
            subject = previous.subject;
            subjectIsTight = true;
          } else {
            subject = left;
            const words = wordCount(
              blankSpans(sentence, left.end, predicate.start, predicateSpans)
            );
            subjectIsTight = !/[,;]/.test(gapFromLeft) && words <= MAX_TIGHT_SUBJECT_GAP_WORDS;
          }
        }

        const candidate = runs.find((run) => run.start >= predicate.end);
        if (candidate) {
          const gapToObject = blankSpans(
            sentence,
            predicate.end,
            candidate.start,
            predicateSpans.filter(({ start }) => start >= predicate.end)
          );
          if (
            !/[,;:]/.test(gapToObject.replace(/\([^)]*\)/g, ' ')) &&
            wordCount(gapToObject) <= MAX_OBJECT_GAP_WORDS
          ) {
            objectRun = candidate;
          }
        }
      }

      previous = { subject, objectRun, start: predicate.start };

      const qualifier =
        definition.rule.kind === 'access'
          ? findQualifier(sentence, predicate, objectRun)
          : undefined;

      const pairs: Array<[EntityMention, EntityMention]> = [];
      if (subject && objectRun) {
        subject.mentions.forEach((s) =>
          objectRun?.mentions.forEach((o) => {
            pairs.push([s, o]);
          })
        );
      } else if (subject && (definition.symmetric || between) && subjectIsTight) {
        for (let i = 0; i < subject.mentions.length; i++) {
          for (let j = i + 1; j < subject.mentions.length; j++) {
            pairs.push([subject.mentions[i], subject.mentions[j]]);
          }
        }
      }

      pairs.forEach(([first, second]) => {
        const a = new Set(first.euids);
        const b = new Set(second.euids);
        if (second.euids.some((euid) => a.has(euid))) {
          return;
        }
        const strength = definition.rule.kind === 'strong' ? 'strong' : 'weak';
        if (strength === 'weak' && isComparisonPair?.(a, b)) {
          return;
        }
        const { backed, detail } = checkPair({ predicate, qualifier, a, b, context });
        if (backed) {
          return;
        }
        const from = index.displayName(first.euids[0]);
        const to = index.displayName(second.euids[0]);
        const key = `${sentence}\u0000${from}\u0000${to}`;
        const reason = `"${predicate.text.trim()}" between ${from} and ${to} is not backed (${detail})`;
        const existing = findings.get(key);
        if (!existing) {
          findings.set(key, { statement: sentence, from, to, strength, reason });
        } else {
          findings.set(key, {
            ...existing,
            strength: existing.strength === 'strong' || strength === 'strong' ? 'strong' : 'weak',
            reason: existing.reason.includes(reason)
              ? existing.reason
              : `${existing.reason}; ${reason}`,
          });
        }
      });
    });
  });
  return [...findings.values()];
};
