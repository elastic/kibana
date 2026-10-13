/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maxBy } from 'lodash';
import type {
  AttentionLevel,
  Fact,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { CheckContext } from './verify';

const LEVEL_RANK: Record<AttentionLevel, number> = { clear: 0, watch: 1, action: 2, urgent: 3 };

const highest = (levels: AttentionLevel[]): AttentionLevel | undefined =>
  maxBy(levels, (level) => LEVEL_RANK[level]);

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

/** Lowers each level to what its cited facts support, then checks the verdict's floors (structural). */
export const checkGuardrails = (context: CheckContext): void => {
  const cap = (path: string, level: AttentionLevel, factIds: readonly number[]): AttentionLevel => {
    const supported = context.citedFacts(factIds).map((fact) => supportOf(fact, context));
    const ceiling = highest(supported) ?? 'clear';
    if (LEVEL_RANK[level] <= LEVEL_RANK[ceiling]) {
      return level;
    }
    context.lowered += 1;
    context.notes.push(`lowered ${path} from "${level}" to "${ceiling}" (cited evidence)`);
    return ceiling;
  };

  for (const [key, assessment] of context.assessments()) {
    assessment.level = cap(`assessments.${key}.level`, assessment.level, assessment.factIds);
  }
  const { verdict } = context.brief;
  verdict.level = cap('verdict.level', verdict.level, context.verdictFactIds());

  // Unaddressed critical or high discoveries are the facts that support `urgent`.
  const discoveryIds = context.evidence.facts
    .filter(
      (fact) => fact.source?.type === 'attack_discovery' && supportOf(fact, context) === 'urgent'
    )
    .map(({ id }) => id);
  if (verdict.level === 'clear' && discoveryIds.length > 0) {
    const ids = discoveryIds.join(', ');
    context.structuralErrors.push(
      `verdict.level: cannot be "clear" while unaddressed critical or high attack discoveries exist (fact ids ${ids}).`
    );
  }

  const worst = highest(context.assessments().map(([, { level }]) => level));
  if (worst && LEVEL_RANK[verdict.level] < LEVEL_RANK[worst]) {
    context.structuralErrors.push(
      `verdict.level: "${verdict.level}" is lower than the most severe assessment ("${worst}"); the verdict must be at least as severe as every assessment.`
    );
  }
};
