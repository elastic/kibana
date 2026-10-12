/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Fact,
  FactKind,
  LinkType,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { LINK_VERBS } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { EvidenceIndex } from './evidence_index';
import { ENTITY_ID_PATTERN, citedFacts, unique } from './evidence_index';
import type { PredicateMatch, StrongKind } from './relation_predicates';
import { findPredicates } from './relation_predicates';
import type { BriefCheck, CheckOutcome } from './types';
import { emptyOutcome, isDropped, listClaims } from './types';

/**
 * A relation claim between two entities without backing. `strong` claims (lateral movement,
 * compromise, exfiltration) drop the claim they are in; `weak` ones keep it and are flagged.
 */
export interface RelationFinding {
  statement: string;
  from: string;
  to: string;
  strength: 'weak' | 'strong';
  reason: string;
}

/** Something that backs a relation between two entities: a link, or a fact naming both. */
interface Backing {
  /** The relation type it stands for; undefined for facts that only show co-occurrence. */
  type?: LinkType;
  factIds: string[];
  label: string;
}

/** Facts that name several entities stand for the matching link type. */
const FACT_LINK_TYPE: Partial<Record<FactKind, LinkType>> = {
  attack_discovery: 'same_attack',
  alert_activity: 'co_alert',
  lead: 'same_lead',
};

const TACTIC_PATTERN: Partial<Record<StrongKind, RegExp>> = {
  lateral: /lateral\s+movement|\bTA0008\b/i,
  exfiltration: /exfiltration|\bTA0010\b/i,
};

const ACCESS_TYPES: readonly LinkType[] = [
  'accesses_frequently',
  'accesses_rarely',
  'communicates_with',
];
const REGULAR_ACCESS_TYPES: readonly LinkType[] = ['accesses_frequently', 'communicates_with'];
const RARE_ACCESS_TYPES: readonly LinkType[] = ['accesses_rarely'];

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

/** Splits prose into sentences. */
export const splitSentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

interface Mention {
  id: string;
  start: number;
  end: number;
}

const findMentions = (sentence: string): Mention[] =>
  [...sentence.matchAll(ENTITY_ID_PATTERN)].map((match) => ({
    id: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

/** Direct backings between two entities: links either way, and facts naming both. */
const directBackings = (index: EvidenceIndex, a: string, b: string): Backing[] => [
  ...index.evidence.links
    .filter(({ from, to }) => (from === a && to === b) || (from === b && to === a))
    .map((link) => ({ type: link.type, factIds: link.factIds, label: LINK_VERBS[link.type] })),
  ...index.evidence.facts
    .filter(({ entities }) => entities.some((id) => id === a) && entities.some((id) => id === b))
    .map((fact) => ({
      type: FACT_LINK_TYPE[fact.kind],
      factIds: [fact.id],
      label: `named together in ${fact.id}`,
    })),
];

const neighbours = (index: EvidenceIndex, id: string): Set<string> => {
  const result = new Set<string>();
  index.evidence.links.forEach(({ from, to }) => {
    if (from === id) result.add(to);
    if (to === id) result.add(from);
  });
  index.evidence.facts.forEach(({ entities }) => {
    if (entities.some((entity) => entity === id)) {
      entities.forEach((entity) => result.add(entity));
    }
  });
  result.delete(id);
  return result;
};

/**
 * Backings for a pair of mentioned entities. A direct link or shared fact is required; the one
 * tolerated exception is two entities that both hang off a common entity ("the same identity
 * logged on to X and later to Y"), in which case the two spokes back the sentence.
 */
const backingsFor = (index: EvidenceIndex, a: string, b: string): Backing[] => {
  const direct = directBackings(index, a, b);
  if (direct.length > 0) {
    return direct;
  }
  const ofB = neighbours(index, b);
  const common = [...neighbours(index, a)].filter((id) => ofB.has(id));
  return common.flatMap((c) => [...directBackings(index, a, c), ...directBackings(index, b, c)]);
};

const hasTactic = (facts: readonly Fact[], pattern: RegExp): boolean =>
  facts.some((fact) => Object.values(fact.details ?? {}).some((value) => pattern.test(value)));

interface Run {
  mentions: Mention[];
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
const buildRuns = (sentence: string, mentions: Mention[], predicates: PredicateMatch[]): Run[] => {
  const runs: Run[] = [];
  let current: Mention[] = [];

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
  const before = QUALIFIER_BEFORE.exec(
    sentence.slice(Math.max(0, predicate.start - 24), predicate.start)
  );
  if (before) {
    return qualifierOf(before[1]);
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

const describeBackings = (backings: Backing[]): string => {
  const labels = unique(backings.map(({ label }) => label));
  return labels.length === 0 ? 'no link between them' : `evidence: ${labels.join(', ')}`;
};

const checkPair = ({
  predicate,
  qualifier,
  a,
  b,
  index,
}: {
  predicate: PredicateMatch;
  qualifier: Qualifier | undefined;
  a: string;
  b: string;
  index: EvidenceIndex;
}): { backed: boolean; detail: string } => {
  const { rule } = predicate.definition;
  const backings = backingsFor(index, a, b);
  const detail = describeBackings(backings);
  const hasType = (types: readonly LinkType[]): boolean =>
    backings.some(({ type }) => type !== undefined && types.includes(type));

  switch (rule.kind) {
    case 'link':
      return { backed: hasType([rule.linkType]), detail };
    case 'access': {
      const allowed =
        qualifier === 'rare'
          ? RARE_ACCESS_TYPES
          : qualifier === 'regular'
          ? REGULAR_ACCESS_TYPES
          : ACCESS_TYPES;
      return { backed: hasType(allowed), detail };
    }
    case 'generic':
      return { backed: backings.length > 0, detail };
    case 'strong': {
      if (backings.length === 0) {
        return { backed: false, detail };
      }
      if (rule.strong === 'compromise') {
        return { backed: hasType(['same_attack']), detail };
      }
      const pattern = TACTIC_PATTERN[rule.strong];
      const backingFacts = citedFacts(
        index,
        backings.flatMap(({ factIds }) => factIds)
      );
      // The tactic must show on a fact behind the pair's own links or shared facts.
      const backed = pattern !== undefined && hasTactic(backingFacts, pattern);
      return { backed, detail: backed ? detail : `${detail}; no fact shows that tactic` };
    }
    default:
      return { backed: true, detail };
  }
};

/**
 * Finds sentences that make a relational claim about two entities that the evidence does not back.
 *
 * Only explicit predicates between two ENT mentions are checked ("ENT-1 logged on to ENT-3",
 * "ENT-1 and ENT-2 appeared together in alerts", "ENT-1 owns ENT-2, ENT-3 and ENT-4" checks 1-2,
 * 1-3 and 1-4, not 2-3). Co-mention and enumeration are not relations. Each predicate is checked
 * on its own. Direction is not parsed: a link either way backs the pair.
 */
export const findUnbackedRelations = ({
  text,
  index,
}: {
  text: string;
  index: EvidenceIndex;
}): RelationFinding[] => {
  const findings = new Map<string, RelationFinding>();

  splitSentences(text).forEach((sentence) => {
    const mentions = findMentions(sentence);
    if (new Set(mentions.map(({ id }) => id)).size < 2) {
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

    let previous: { subject?: Run; objectRun?: Run; start: number } | undefined;

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

      const pairs: Array<[Mention, Mention]> = [];
      if (subject && objectRun) {
        const objects = objectRun.mentions;
        subject.mentions.forEach((s) => objects.forEach((o) => pairs.push([s, o])));
      } else if (subject && (definition.symmetric || between) && subjectIsTight) {
        const members = subject.mentions;
        members.forEach((first, i) =>
          members.slice(i + 1).forEach((second) => pairs.push([first, second]))
        );
      }

      pairs.forEach(([first, second]) => {
        if (first.id === second.id) {
          return;
        }
        const strength = definition.rule.kind === 'strong' ? 'strong' : 'weak';
        const { backed, detail } = checkPair({
          predicate,
          qualifier,
          a: first.id,
          b: second.id,
          index,
        });
        if (backed) {
          return;
        }
        const key = `${sentence}\u0000${first.id}\u0000${second.id}`;
        const reason = `"${predicate.text.trim()}" between ${first.id} and ${
          second.id
        } is not backed (${detail})`;
        const existing = findings.get(key);
        findings.set(
          key,
          existing
            ? {
                ...existing,
                strength:
                  existing.strength === 'strong' || strength === 'strong' ? 'strong' : 'weak',
                reason: existing.reason.includes(reason)
                  ? existing.reason
                  : `${existing.reason}; ${reason}`,
              }
            : { statement: sentence, from: first.id, to: second.id, strength, reason }
        );
      });
    });
  });
  return [...findings.values()];
};

/**
 * Relations: a strong unbacked relation (lateral movement, compromise, exfiltration between two
 * entities without a backing fact or link) drops the claim, or is structural for the verdict.
 * A weak one (a verb no link backs) keeps the claim and is flagged.
 */
export const checkRelations: BriefCheck = (brief, context): CheckOutcome => {
  const { index } = context;
  const outcome = emptyOutcome(brief);

  listClaims(brief).forEach((claim) => {
    if (isDropped(context, claim.path)) {
      return;
    }
    const strong: string[] = [];
    claim.fields.forEach(({ path, text }) => {
      findUnbackedRelations({ text, index }).forEach((finding) => {
        if (finding.strength === 'strong') {
          strong.push(`${path}: ${finding.reason}`);
        } else {
          outcome.flags.push({ path, check: 'relation', message: finding.reason });
        }
      });
    });
    if (strong.length === 0) {
      return;
    }
    const reason = `unbacked relation claims: ${strong.join('; ')}`;
    if (claim.path === undefined) {
      outcome.structuralErrors.push(
        `verdict: ${reason}. Describe relations only with the provided link wording.`
      );
    } else {
      outcome.drops.push({ path: claim.path, check: 'relation', reason });
    }
  });
  return outcome;
};
