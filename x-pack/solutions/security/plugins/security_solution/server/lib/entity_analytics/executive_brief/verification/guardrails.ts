/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttentionLevel,
  Fact,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { BriefCheck, CheckContext } from './context';
import { citedFacts, keptAssessments, mapAssessments, verdictFactIds } from './context';

const LEVEL_RANK: Record<AttentionLevel, number> = { clear: 0, watch: 1, action: 2, urgent: 3 };

const higher = (a: AttentionLevel, b: AttentionLevel): AttentionLevel =>
  LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;

const HANDLED_STATUS = /^(?:acknowledged|closed|in[-_ ]progress|resolved)$/i;

/** Handled when its own status says so (e.g. an acknowledged discovery) or a case covers one of its entities. */
const isAddressed = (fact: Fact, { evidence }: CheckContext): boolean =>
  HANDLED_STATUS.test(fact.details?.status ?? '') ||
  evidence.facts.some(
    (other) =>
      other.source?.type === 'case' &&
      other.entityIds.some((entityId) => fact.entityIds.includes(entityId))
  );

/** `urgent` needs an unaddressed critical or high fact; handled, medium or unrated ones support `action`; low ones `watch`. */
const supportOf = (fact: Fact, context: CheckContext): AttentionLevel => {
  switch (fact.severity) {
    case 'critical':
    case 'high':
      return isAddressed(fact, context) ? 'action' : 'urgent';
    case 'low':
      return 'watch';
    default:
      return 'action';
  }
};

/**
 * Guardrails: small deterministic bounds on the AI's judgement.
 * - Ceiling: a level never exceeds what its cited facts support (the verdict: what its kept
 *   assessments cite, so a verdict without them is `clear`); higher levels are lowered.
 * - Floors (structural): the verdict is never `clear` while an unaddressed critical or high attack
 *   discovery exists, and never calmer than its most severe assessment.
 */
export const checkGuardrails: BriefCheck = (brief, context) => {
  const cap = (path: string, level: AttentionLevel, factIds: readonly number[]): AttentionLevel => {
    const ceiling = citedFacts(context, factIds).reduce<AttentionLevel>(
      (supported, fact) => higher(supported, supportOf(fact, context)),
      'clear'
    );
    if (LEVEL_RANK[level] <= LEVEL_RANK[ceiling]) {
      return level;
    }
    context.lowered += 1;
    context.notes.push(`lowered ${path} from "${level}" to "${ceiling}" (cited evidence)`);
    return ceiling;
  };

  const assessments = mapAssessments(brief.assessments, (assessment, key) =>
    context.dropped.has(key)
      ? assessment
      : {
          ...assessment,
          level: cap(`assessments.${key}.level`, assessment.level, assessment.factIds),
        }
  );
  const capped = { ...brief, assessments };
  const level = cap('verdict.level', brief.verdict.level, verdictFactIds(capped, context));

  const discoveries = context.evidence.facts.filter(
    (fact) =>
      fact.source?.type === 'attack_discovery' &&
      (fact.severity === 'critical' || fact.severity === 'high') &&
      !isAddressed(fact, context)
  );
  if (level === 'clear' && discoveries.length > 0) {
    context.structuralErrors.push(
      `verdict.level: cannot be "clear" while unaddressed critical or high attack discoveries exist (fact ids ${discoveries
        .map(({ id }) => id)
        .join(', ')}).`
    );
  }

  const worst = keptAssessments(capped, context).reduce<AttentionLevel | undefined>(
    (acc, assessment) => (acc ? higher(acc, assessment.level) : assessment.level),
    undefined
  );
  if (worst && LEVEL_RANK[level] < LEVEL_RANK[worst]) {
    context.structuralErrors.push(
      `verdict.level: "${level}" is lower than the most severe assessment ("${worst}"); the verdict must be at least as severe as every assessment.`
    );
  }
  return { verdict: { ...brief.verdict, level }, assessments };
};
